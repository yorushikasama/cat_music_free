package `fun`.upup.catmusicfree.storageAccess

import android.app.Activity
import android.content.ContentValues
import android.content.Intent
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.DocumentsContract
import android.provider.MediaStore
import android.provider.OpenableColumns
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import java.io.File
import java.io.FileInputStream

class StorageAccessModule(
    private val context: ReactApplicationContext,
) : ReactContextBaseJavaModule(context), ActivityEventListener {
    private var pendingPromise: Promise? = null
    private var pendingRequestCode: Int? = null

    init {
        context.addActivityEventListener(this)
    }

    override fun getName() = "StorageAccess"

    @ReactMethod
    fun selectDirectory(initialUri: String?, promise: Promise) {
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).apply {
            addFlags(INTENT_FLAGS)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !initialUri.isNullOrBlank()) {
                putExtra(DocumentsContract.EXTRA_INITIAL_URI, Uri.parse(initialUri))
            }
        }
        launch(intent, REQUEST_DIRECTORY, promise)
    }

    @ReactMethod
    fun createDocument(fileName: String, mimeType: String, promise: Promise) {
        val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = mimeType.ifBlank { "application/octet-stream" }
            putExtra(Intent.EXTRA_TITLE, fileName)
            addFlags(INTENT_FLAGS)
        }
        launch(intent, REQUEST_CREATE_DOCUMENT, promise)
    }

    @ReactMethod
    fun openDocuments(mimeTypes: ReadableArray, multiple: Boolean, promise: Promise) {
        val types = (0 until mimeTypes.size())
            .mapNotNull { mimeTypes.getString(it)?.takeIf(String::isNotBlank) }
            .toTypedArray()
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = if (types.size == 1) types[0] else "*/*"
            if (types.size > 1) putExtra(Intent.EXTRA_MIME_TYPES, types)
            putExtra(Intent.EXTRA_ALLOW_MULTIPLE, multiple)
            addFlags(INTENT_FLAGS)
        }
        launch(intent, REQUEST_OPEN_DOCUMENTS, promise)
    }

    @ReactMethod
    fun writeText(uriString: String, content: String, promise: Promise) {
        try {
            context.contentResolver.openOutputStream(Uri.parse(uriString), "wt").use { output ->
                requireNotNull(output) { "Unable to open the selected document" }
                output.writer(Charsets.UTF_8).use { it.write(content) }
            }
            promise.resolve(true)
        } catch (error: Exception) {
            promise.reject("WRITE_DOCUMENT_FAILED", error.message, error)
        }
    }

    @ReactMethod
    fun readText(uriString: String, promise: Promise) {
        try {
            val content = context.contentResolver.openInputStream(Uri.parse(uriString)).use { input ->
                requireNotNull(input) { "Unable to open the selected document" }
                input.reader(Charsets.UTF_8).use { it.readText() }
            }
            promise.resolve(content)
        } catch (error: Exception) {
            promise.reject("READ_DOCUMENT_FAILED", error.message, error)
        }
    }

    @ReactMethod
    fun copyFileToUri(sourcePath: String, destinationUri: String, promise: Promise) {
        try {
            copyFile(sourcePath, Uri.parse(destinationUri))
            promise.resolve(destinationUri)
        } catch (error: Exception) {
            promise.reject("COPY_DOCUMENT_FAILED", error.message, error)
        }
    }

    @ReactMethod
    fun copyFileToTree(
        sourcePath: String,
        treeUriString: String,
        displayName: String,
        mimeType: String,
        promise: Promise,
    ) {
        try {
            val treeUri = Uri.parse(treeUriString)
            val parentUri = DocumentsContract.buildDocumentUriUsingTree(
                treeUri,
                DocumentsContract.getTreeDocumentId(treeUri),
            )
            val destination = DocumentsContract.createDocument(
                context.contentResolver,
                parentUri,
                mimeType.ifBlank { "application/octet-stream" },
                displayName,
            ) ?: error("Unable to create a file in the selected directory")
            copyFile(sourcePath, destination)
            promise.resolve(destination.toString())
        } catch (error: Exception) {
            promise.reject("COPY_TO_TREE_FAILED", error.message, error)
        }
    }

    @ReactMethod
    fun publishAudio(
        sourcePath: String,
        displayName: String,
        mimeType: String,
        artist: String?,
        album: String?,
        promise: Promise,
    ) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val values = ContentValues().apply {
                    put(MediaStore.Audio.Media.DISPLAY_NAME, displayName)
                    put(MediaStore.Audio.Media.MIME_TYPE, mimeType)
                    put(MediaStore.Audio.Media.RELATIVE_PATH, "${Environment.DIRECTORY_MUSIC}/CatMusicFree")
                    put(MediaStore.Audio.Media.IS_PENDING, 1)
                    artist?.takeIf(String::isNotBlank)?.let { put(MediaStore.Audio.Media.ARTIST, it) }
                    album?.takeIf(String::isNotBlank)?.let { put(MediaStore.Audio.Media.ALBUM, it) }
                }
                val uri = context.contentResolver.insert(
                    MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                    values,
                ) ?: error("Unable to create the MediaStore item")
                try {
                    copyFile(sourcePath, uri)
                    values.clear()
                    values.put(MediaStore.Audio.Media.IS_PENDING, 0)
                    context.contentResolver.update(uri, values, null, null)
                    promise.resolve(uri.toString())
                } catch (error: Exception) {
                    context.contentResolver.delete(uri, null, null)
                    throw error
                }
            } else {
                val directory = File(
                    Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MUSIC),
                    "CatMusicFree",
                )
                check(directory.exists() || directory.mkdirs()) { "Unable to create the music directory" }
                val destination = uniqueFile(directory, displayName)
                inputStream(sourcePath).use { input ->
                    destination.outputStream().use { output -> input.copyTo(output) }
                }
                MediaScannerConnection.scanFile(
                    context,
                    arrayOf(destination.absolutePath),
                    arrayOf(mimeType),
                    null,
                )
                promise.resolve(Uri.fromFile(destination).toString())
            }
        } catch (error: Exception) {
            promise.reject("PUBLISH_AUDIO_FAILED", error.message, error)
        }
    }

    @ReactMethod
    fun documentExists(uriString: String, promise: Promise) {
        try {
            context.contentResolver.openAssetFileDescriptor(Uri.parse(uriString), "r").use {
                promise.resolve(it != null)
            }
        } catch (_: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun deleteDocument(uriString: String, promise: Promise) {
        try {
            val uri = Uri.parse(uriString)
            val deleted = if (DocumentsContract.isDocumentUri(context, uri)) {
                DocumentsContract.deleteDocument(context.contentResolver, uri)
            } else {
                context.contentResolver.delete(uri, null, null) > 0
            }
            promise.resolve(deleted)
        } catch (error: Exception) {
            promise.reject("DELETE_DOCUMENT_FAILED", error.message, error)
        }
    }

    override fun onActivityResult(
        activity: Activity,
        requestCode: Int,
        resultCode: Int,
        data: Intent?,
    ) {
        if (pendingRequestCode != requestCode) return
        val promise = pendingPromise ?: return
        pendingPromise = null
        pendingRequestCode = null

        if (resultCode != Activity.RESULT_OK || data == null) {
            promise.resolve(null)
            return
        }

        try {
            when (requestCode) {
                REQUEST_DIRECTORY -> {
                    val uri = requireNotNull(data.data)
                    persistPermission(uri, data.flags)
                    promise.resolve(documentInfo(uri))
                }
                REQUEST_CREATE_DOCUMENT -> {
                    val uri = requireNotNull(data.data)
                    persistPermission(uri, data.flags)
                    promise.resolve(documentInfo(uri))
                }
                REQUEST_OPEN_DOCUMENTS -> {
                    val uris = mutableListOf<Uri>()
                    data.clipData?.let { clip ->
                        for (index in 0 until clip.itemCount) uris.add(clip.getItemAt(index).uri)
                    }
                    data.data?.let { if (!uris.contains(it)) uris.add(it) }
                    val result = Arguments.createArray()
                    uris.forEach { uri ->
                        persistPermission(uri, data.flags)
                        result.pushMap(documentInfo(uri))
                    }
                    promise.resolve(result)
                }
            }
        } catch (error: Exception) {
            promise.reject("DOCUMENT_PICKER_FAILED", error.message, error)
        }
    }

    override fun onNewIntent(intent: Intent) = Unit

    private fun launch(intent: Intent, requestCode: Int, promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No foreground activity is available")
            return
        }
        if (pendingPromise != null) {
            promise.reject("PICKER_BUSY", "Another document picker is already open")
            return
        }
        pendingPromise = promise
        pendingRequestCode = requestCode
        try {
            activity.startActivityForResult(intent, requestCode)
        } catch (error: Exception) {
            pendingPromise = null
            pendingRequestCode = null
            promise.reject("PICKER_START_FAILED", error.message, error)
        }
    }

    private fun persistPermission(uri: Uri, resultFlags: Int) {
        val flags = resultFlags and URI_PERMISSION_FLAGS
        if (flags != 0) {
            try {
                context.contentResolver.takePersistableUriPermission(uri, flags)
            } catch (_: SecurityException) {
                // Some providers grant access for this session without persistable permission.
            }
        }
    }

    private fun documentInfo(uri: Uri) = Arguments.createMap().apply {
        putString("uri", uri.toString())
        var name: String? = null
        var mimeType: String? = context.contentResolver.getType(uri)
        var size: Long? = null
        context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) {
                cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME).takeIf { it >= 0 }?.let {
                    name = cursor.getString(it)
                }
                cursor.getColumnIndex(OpenableColumns.SIZE).takeIf { it >= 0 && !cursor.isNull(it) }?.let {
                    size = cursor.getLong(it)
                }
            }
        }
        if (name == null && DocumentsContract.isTreeUri(uri)) {
            name = DocumentsContract.getTreeDocumentId(uri).substringAfterLast(':')
        }
        putString("name", name)
        putString("mimeType", mimeType)
        size?.let { putDouble("size", it.toDouble()) }
    }

    private fun copyFile(sourcePath: String, destination: Uri) {
        inputStream(sourcePath).use { input ->
            context.contentResolver.openOutputStream(destination, "w").use { output ->
                requireNotNull(output) { "Unable to open the destination" }
                input.copyTo(output)
            }
        }
    }

    private fun inputStream(sourcePath: String) = FileInputStream(
        if (sourcePath.startsWith("file://")) {
            requireNotNull(Uri.parse(sourcePath).path)
        } else {
            sourcePath
        },
    )

    private fun uniqueFile(directory: File, displayName: String): File {
        var file = File(directory, displayName)
        if (!file.exists()) return file
        val dot = displayName.lastIndexOf('.')
        val stem = if (dot > 0) displayName.substring(0, dot) else displayName
        val extension = if (dot > 0) displayName.substring(dot) else ""
        var index = 1
        while (file.exists()) {
            file = File(directory, "$stem ($index)$extension")
            index++
        }
        return file
    }

    companion object {
        private const val REQUEST_DIRECTORY = 7241
        private const val REQUEST_CREATE_DOCUMENT = 7242
        private const val REQUEST_OPEN_DOCUMENTS = 7243
        private const val URI_PERMISSION_FLAGS =
            Intent.FLAG_GRANT_READ_URI_PERMISSION or
                Intent.FLAG_GRANT_WRITE_URI_PERMISSION
        private const val INTENT_FLAGS =
            URI_PERMISSION_FLAGS or
                Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION or
                Intent.FLAG_GRANT_PREFIX_URI_PERMISSION
    }
}
