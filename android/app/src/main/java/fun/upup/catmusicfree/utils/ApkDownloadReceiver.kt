package `fun`.upup.catmusicfree.utils

import android.app.DownloadManager
import android.content.ActivityNotFoundException
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.widget.Toast

class ApkDownloadReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != DownloadManager.ACTION_DOWNLOAD_COMPLETE) {
            return
        }

        val completedId = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L)
        val expectedId = getDownloadId(context)
        if (completedId == -1L || completedId != expectedId) {
            return
        }

        val downloadManager = context.getSystemService(Context.DOWNLOAD_SERVICE) as? DownloadManager
            ?: return
        val query = DownloadManager.Query().setFilterById(completedId)
        downloadManager.query(query)?.use { cursor ->
            if (!cursor.moveToFirst()) {
                return
            }

            val statusIndex = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS)
            if (statusIndex < 0 || cursor.getInt(statusIndex) != DownloadManager.STATUS_SUCCESSFUL) {
                clearDownloadId(context)
                return
            }

            val uri = downloadManager.getUriForDownloadedFile(completedId) ?: run {
                clearDownloadId(context)
                return
            }
            openInstaller(context, uri)
        }
    }

    companion object {
        private const val PREF_NAME = "CatMusicFree.UpdateDownload"
        private const val KEY_DOWNLOAD_ID = "downloadId"

        fun saveDownloadId(context: Context, downloadId: Long) {
            context
                .getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
                .edit()
                .putLong(KEY_DOWNLOAD_ID, downloadId)
                .apply()
        }

        private fun getDownloadId(context: Context): Long {
            return context
                .getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
                .getLong(KEY_DOWNLOAD_ID, -1L)
        }

        private fun clearDownloadId(context: Context) {
            context
                .getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
                .edit()
                .remove(KEY_DOWNLOAD_ID)
                .apply()
        }

        private fun openInstaller(context: Context, apkUri: Uri) {
            if (
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
                !context.packageManager.canRequestPackageInstalls()
            ) {
                val settingsIntent = Intent(
                    Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:${context.packageName}"),
                ).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                startActivitySafely(
                    context,
                    settingsIntent,
                    "请允许安装未知应用，然后重新安装更新包",
                )
                return
            }

            val installIntent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(apkUri, UtilsModule.APK_MIME_TYPE)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            startActivitySafely(context, installIntent, "无法打开系统安装器")
        }

        private fun startActivitySafely(context: Context, intent: Intent, errorText: String) {
            try {
                context.startActivity(intent)
            } catch (_: ActivityNotFoundException) {
                Toast.makeText(context, errorText, Toast.LENGTH_LONG).show()
            } catch (_: SecurityException) {
                Toast.makeText(context, errorText, Toast.LENGTH_LONG).show()
            } catch (_: Exception) {
                Toast.makeText(context, errorText, Toast.LENGTH_LONG).show()
            }
        }
    }
}
