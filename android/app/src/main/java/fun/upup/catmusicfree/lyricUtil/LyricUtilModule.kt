package `fun`.upup.catmusicfree.lyricUtil

import android.content.Intent
import android.net.Uri
import android.provider.Settings
import com.facebook.react.bridge.*

class LyricUtilModule(private val reactContext: ReactApplicationContext): ReactContextBaseJavaModule(reactContext) {
    override fun getName() = "LyricUtil"
    private var lyricView: LyricView? = null

    @ReactMethod
    fun checkSystemAlertPermission(promise: Promise) {
        try {
            promise.resolve(Settings.canDrawOverlays(reactContext))
        } catch (e: Exception) {
            promise.reject("Error", e.message)
        }
    }

    @ReactMethod
    fun requestSystemAlertPermission(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION).apply {
                data = Uri.parse("package:" + reactContext.packageName)
            }
            currentActivity?.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("Error", e.message)
        }
    }

    @ReactMethod
    fun showStatusBarLyric(initLyric: String?, options: ReadableMap?, promise: Promise) {
        try {
            UiThreadUtil.runOnUiThread {
                if (lyricView == null) {
                    lyricView = LyricView(reactContext)
                }

                val mapOptions = mutableMapOf<String, Any>().apply {
                    if (options == null) {
                        return@apply
                    }
                    if (options.hasKey("topPercent")) {
                        put("topPercent", options.getDouble("topPercent"))
                    }
                    if (options.hasKey("leftPercent")) {
                        put("leftPercent", options.getDouble("leftPercent"))
                    }
                    if (options.hasKey("align")) {
                        put("align", options.getInt("align"))
                    }
                    if (options.hasKey("color")) {
                        options.getString("color")?.let { put("color", it) }
                    }
                    if (options.hasKey("backgroundColor")) {
                        options.getString("backgroundColor")?.let { put("backgroundColor", it) }
                    }
                    if (options.hasKey("widthPercent")) {
                        put("widthPercent", options.getDouble("widthPercent"))
                    }
                    if (options.hasKey("fontSize")) {
                        put("fontSize", options.getDouble("fontSize"))
                    }
                    if (options.hasKey("locked")) {
                        put("locked", options.getBoolean("locked"))
                    }
                    if (options.hasKey("mode")) {
                        options.getString("mode")?.let { put("mode", it) }
                    }
                    if (options.hasKey("style")) {
                        options.getString("style")?.let { put("style", it) }
                    }
                    if (options.hasKey("emptyBehavior")) {
                        options.getString("emptyBehavior")?.let { put("emptyBehavior", it) }
                    }
                    if (options.hasKey("fallbackText")) {
                        options.getString("fallbackText")?.let { put("fallbackText", it) }
                    }
                }

                try {
                    lyricView?.showLyricWindow(initLyric, mapOptions)
                    val keepAlive = if (options?.hasKey("keepAlive") == true) {
                        options.getBoolean("keepAlive")
                    } else {
                        true
                    }
                    if (keepAlive) {
                        StatusBarLyricService.start(reactContext)
                    } else {
                        StatusBarLyricService.stop(reactContext)
                    }
                    promise.resolve(true)
                } catch (e: Exception) {
                    promise.reject("Exception", e.message)
                }
            }
        } catch (e: Exception) {
            promise.reject("Exception", e.message)
        }
    }

    @ReactMethod
    fun hideStatusBarLyric(promise: Promise) {
        try {
            UiThreadUtil.runOnUiThread {
                lyricView?.hideLyricWindow()
            }
            StatusBarLyricService.stop(reactContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("Exception", e.message)
        }
    }

    @ReactMethod
    fun setStatusBarLyricText(lyric: String, promise: Promise) {
        try {
            UiThreadUtil.runOnUiThread {
                lyricView?.setText(lyric)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("Exception", e.message)
        }
    }

    @ReactMethod
    fun setStatusBarLyricAlign(alignment: Int, promise: Promise) {
        try {
            UiThreadUtil.runOnUiThread {
                lyricView?.setAlign(alignment)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("Exception", e.message)
        }
    }

    @ReactMethod
    fun setStatusBarLyricTop(pct: Double, promise: Promise) {
        try {
            UiThreadUtil.runOnUiThread {
                lyricView?.setTopPercent(pct)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("Exception", e.message)
        }
    }

    @ReactMethod
    fun setStatusBarLyricLeft(pct: Double, promise: Promise) {
        try {
            UiThreadUtil.runOnUiThread {
                lyricView?.setLeftPercent(pct)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("Exception", e.message)
        }
    }

    @ReactMethod
    fun setStatusBarLyricWidth(pct: Double, promise: Promise) {
        try {
            UiThreadUtil.runOnUiThread {
                lyricView?.setWidth(pct)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("Exception", e.message)
        }
    }

    @ReactMethod
    fun setStatusBarLyricFontSize(fontSize: Float, promise: Promise) {
        try {
            UiThreadUtil.runOnUiThread {
                lyricView?.setFontSize(fontSize)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("Exception", e.message)
        }
    }

    @ReactMethod
    fun setStatusBarColors(textColor: String?, backgroundColor: String?, promise: Promise) {
        try {
            UiThreadUtil.runOnUiThread {
                lyricView?.setColors(textColor, backgroundColor)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("Exception", e.message)
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required by React Native NativeEventEmitter.
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required by React Native NativeEventEmitter.
    }

    @ReactMethod
    fun setStatusBarLyricLocked(locked: Boolean, promise: Promise) {
        try {
            UiThreadUtil.runOnUiThread {
                lyricView?.setLocked(locked)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("Exception", e.message)
        }
    }

    @ReactMethod
    fun setStatusBarLyricMode(mode: String, promise: Promise) {
        try {
            UiThreadUtil.runOnUiThread {
                lyricView?.setMode(mode)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("Exception", e.message)
        }
    }

    @ReactMethod
    fun setStatusBarLyricStyle(style: String, promise: Promise) {
        try {
            UiThreadUtil.runOnUiThread {
                lyricView?.setStyle(style)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("Exception", e.message)
        }
    }

    @ReactMethod
    fun setStatusBarLyricEmptyBehavior(behavior: String, fallbackText: String?, promise: Promise) {
        try {
            UiThreadUtil.runOnUiThread {
                lyricView?.setEmptyBehavior(behavior, fallbackText)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("Exception", e.message)
        }
    }

    @ReactMethod
    fun setStatusBarLyricPaused(paused: Boolean, promise: Promise) {
        try {
            UiThreadUtil.runOnUiThread {
                lyricView?.setPaused(paused)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("Exception", e.message)
        }
    }

    @ReactMethod
    fun setStatusBarLyricKeepAlive(enabled: Boolean, promise: Promise) {
        try {
            if (enabled) {
                StatusBarLyricService.start(reactContext)
            } else {
                StatusBarLyricService.stop(reactContext)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("Exception", e.message)
        }
    }

}
