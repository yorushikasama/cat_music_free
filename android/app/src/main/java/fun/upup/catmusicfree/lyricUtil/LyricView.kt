package `fun`.upup.catmusicfree.lyricUtil

import android.app.Activity
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Paint
import android.graphics.drawable.GradientDrawable
import android.hardware.SensorManager
import android.os.Build
import android.util.DisplayMetrics
import android.view.Gravity
import android.view.MotionEvent
import android.view.OrientationEventListener
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule



class LyricView(private val reactContext: ReactContext) : Activity(), View.OnTouchListener {

    private var windowManager: WindowManager? = null
    private var orientationEventListener: OrientationEventListener? = null
    private var layoutParams: WindowManager.LayoutParams? = null
    private var rootView: LinearLayout? = null
    private var primaryTextView: StrokeTextView? = null
    private var secondaryTextView: StrokeTextView? = null

    // 窗口信息
    private var windowWidth = 0.0
    private var windowHeight = 0.0
    private var widthPercent = 0.0
    private var leftPercent = 0.0
    private var topPercent = 0.0
    private var locked = true
    private var lyricMode = "double"
    private var stylePreset = "glass"
    private var emptyBehavior = "track"
    private var textColor = "#FFE9D2"
    private var backgroundColor = "#84888153"
    private var fontSize = 14f
    private var align = Gravity.CENTER
    private var fallbackText = "CatMusicFree"
    private var paused = false
    private var rawText = ""
    private var secondaryText = ""
    private var downRawX = 0f
    private var downRawY = 0f
    private var downX = 0
    private var downY = 0
    private var dragging = false
    private var lastTapTime = 0L

    override fun onTouch(view: View, motionEvent: MotionEvent): Boolean {
        if (locked) return false

        val params = layoutParams ?: return false
        val manager = windowManager ?: return false
        val target = rootView ?: return false

        when (motionEvent.action) {
            MotionEvent.ACTION_DOWN -> {
                downRawX = motionEvent.rawX
                downRawY = motionEvent.rawY
                downX = params.x
                downY = params.y
                dragging = false
                return true
            }
            MotionEvent.ACTION_MOVE -> {
                val nextX = downX + (motionEvent.rawX - downRawX).toInt()
                val nextY = downY + (motionEvent.rawY - downRawY).toInt()
                val maxX = (windowWidth - params.width).toInt().coerceAtLeast(0)
                val maxY = (windowHeight - target.height).toInt().coerceAtLeast(0)
                params.x = nextX.coerceIn(0, maxX)
                params.y = nextY.coerceIn(0, maxY)
                manager.updateViewLayout(target, params)
                dragging = true
                return true
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                if (!dragging && motionEvent.action == MotionEvent.ACTION_UP) {
                    val now = System.currentTimeMillis()
                    if (now - lastTapTime < 320) {
                        setLocked(true)
                        emitLockedChanged()
                        lastTapTime = 0L
                        return true
                    }
                    lastTapTime = now
                }
                snapToEdgeIfNeeded()
                syncPositionFromLayout()
                emitPositionChanged()
                return dragging
            }
        }
        return false
    }

    // 展示歌词窗口
    fun showLyricWindow(initText: String?, options: Map<String, Any>) {
        try {
            if (windowManager == null) {
                windowManager = reactContext.getSystemService(WINDOW_SERVICE) as WindowManager
                layoutParams = WindowManager.LayoutParams()

                val outMetrics = DisplayMetrics()
                windowManager?.defaultDisplay?.getMetrics(outMetrics)
                windowWidth = outMetrics.widthPixels.toDouble()
                windowHeight = outMetrics.heightPixels.toDouble()

                layoutParams?.type = if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O)
                    WindowManager.LayoutParams.TYPE_SYSTEM_ALERT
                else
                    WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY

                /*
                 * topPercent: number;
                 * leftPercent: number;
                 * align: number;
                 * color: string;
                 * backgroundColor: string;
                 * widthPercent: number;
                 * fontSize: number;
                 * locked: boolean;
                 * mode: single | double;
                 * style: glass | neon | plain | dark;
                 * emptyBehavior: hide | track | app;
                 * fallbackText: string;
                 */
                val topPercent = options["topPercent"]
                val leftPercent = options["leftPercent"]
                val align = options["align"]
                val color = options["color"]
                val backgroundColor = options["backgroundColor"]
                val widthPercent = options["widthPercent"]
                val fontSize = options["fontSize"]
                val locked = options["locked"]
                val mode = options["mode"]
                val style = options["style"]
                val emptyBehavior = options["emptyBehavior"]
                val fallbackText = options["fallbackText"]

                this.widthPercent = widthPercent?.toString()?.toDouble() ?: 0.5
                this.locked = locked?.toString()?.toBooleanStrictOrNull() ?: true
                this.lyricMode = mode?.toString() ?: "double"
                this.stylePreset = style?.toString() ?: "glass"
                this.emptyBehavior = emptyBehavior?.toString() ?: "track"
                this.fallbackText = fallbackText?.toString()?.ifEmpty { "CatMusicFree" } ?: "CatMusicFree"
                this.textColor = color?.toString() ?: "#FFE9D2"
                this.backgroundColor = backgroundColor?.toString() ?: "#84888153"
                this.fontSize = fontSize?.toString()?.toFloat() ?: 14f
                this.align = align?.toString()?.toInt() ?: Gravity.CENTER

                layoutParams?.width = (this.widthPercent * windowWidth).toInt()
                layoutParams?.height = WindowManager.LayoutParams.WRAP_CONTENT
                layoutParams?.gravity = Gravity.TOP or Gravity.START

                this.leftPercent = leftPercent?.toString()?.toDouble() ?: 0.5
                layoutParams?.x = (this.leftPercent * (windowWidth - layoutParams!!.width)).toInt()
                layoutParams?.y = 0

                updateLayoutFlags()

                layoutParams?.format = PixelFormat.TRANSPARENT

                primaryTextView = StrokeTextView(reactContext).apply {
                    includeFontPadding = false
                }
                secondaryTextView = StrokeTextView(reactContext).apply {
                    includeFontPadding = false
                }
                rootView = LinearLayout(reactContext).apply {
                    orientation = LinearLayout.VERTICAL
                    setPadding(dp(14), dp(8), dp(14), dp(8))
                    setOnTouchListener(this@LyricView)
                }
                rootView?.addView(primaryTextView)
                rootView?.addView(secondaryTextView)
                applyStyle()
                setText(initText ?: "")
                windowManager?.addView(rootView, layoutParams)

                topPercent?.toString()?.toDouble()?.let { setTopPercent(it) }

                listenOrientationChange()
            }
        } catch (e: Exception) {
            hideLyricWindow()
            throw e
        }
    }

    private fun listenOrientationChange() {
        if (windowManager == null) return

        if (orientationEventListener == null) {
            orientationEventListener = object : OrientationEventListener(reactContext, SensorManager.SENSOR_DELAY_NORMAL) {
                override fun onOrientationChanged(orientation: Int) {
                    if (windowManager != null) {
                        val outMetrics = DisplayMetrics()
                        windowManager?.defaultDisplay?.getMetrics(outMetrics)
                        windowWidth = outMetrics.widthPixels.toDouble()
                        windowHeight = outMetrics.heightPixels.toDouble()
                        layoutParams?.width = (widthPercent * windowWidth).toInt()
                        layoutParams?.x = (leftPercent * (windowWidth - layoutParams!!.width)).toInt()
                        layoutParams?.y = (topPercent * (windowHeight - (rootView?.height ?: 0))).toInt()
                        windowManager?.updateViewLayout(rootView, layoutParams)
                    }
                }
            }
        }

        if (orientationEventListener?.canDetectOrientation() == true) {
            orientationEventListener?.enable()
        }
    }

    private fun unlistenOrientationChange() {
        orientationEventListener?.disable()
    }

    private fun rgba2argb(color: String): String {
        return if (color.length == 9) {
            color[0] + color.substring(7, 9) + color.substring(1, 7)
        } else {
            color
        }
    }

    // 隐藏歌词窗口
    fun hideLyricWindow() {
        if (windowManager != null) {
            rootView?.let {
                try {
                    windowManager?.removeView(it)
                } catch (e: Exception) {
                    // Handle exception
                }
                rootView = null
                primaryTextView = null
                secondaryTextView = null
            }
            windowManager = null
            layoutParams = null
            unlistenOrientationChange()
        }
    }

    // 设置歌词内容
    fun setText(text: String) {
        rawText = text
        val lines = text.split("\n").map { it.trim() }.filter { it.isNotEmpty() }
        val primary = lines.firstOrNull() ?: resolveEmptyText()
        val secondary = lines.drop(1).firstOrNull() ?: ""
        secondaryText = secondary

        rootView?.visibility = if (primary.isEmpty()) View.GONE else View.VISIBLE
        primaryTextView?.text = primary
        secondaryTextView?.text = secondary
        secondaryTextView?.visibility = if (lyricMode == "double" && secondary.isNotEmpty()) {
            View.VISIBLE
        } else {
            View.GONE
        }
    }

    fun setAlign(gravity: Int) {
        this.align = gravity
        applyTextGravity()
    }

    fun setTopPercent(pct: Double) {
        var percent = pct.coerceIn(0.0, 1.0)
        rootView?.let {
            layoutParams?.y = (percent * (windowHeight - it.height)).toInt()
            windowManager?.updateViewLayout(it, layoutParams)
        }
        this.topPercent = percent
    }

    fun setLeftPercent(pct: Double) {
        var percent = pct.coerceIn(0.0, 1.0)
        rootView?.let {
            layoutParams?.x = (percent * (windowWidth - layoutParams!!.width)).toInt()
            windowManager?.updateViewLayout(it, layoutParams)
        }
        this.leftPercent = percent
    }

    fun setColors(textColor: String?, backgroundColor: String?) {
        textColor?.let { this.textColor = it }
        backgroundColor?.let { this.backgroundColor = it }
        applyStyle()
    }

    fun setWidth(pct: Double) {
        var percent = pct.coerceIn(0.3, 1.0)
        rootView?.let {
            val width = (percent * windowWidth).toInt()
            val originalWidth = layoutParams?.width ?: 0
            layoutParams?.x = if (width <= originalWidth) {
                layoutParams!!.x + (originalWidth - width) / 2
            } else {
                layoutParams!!.x - (width - originalWidth) / 2
            }.coerceAtLeast(0).coerceAtMost((windowWidth - width).toInt())
            layoutParams?.width = width
            windowManager?.updateViewLayout(it, layoutParams)
        }
        this.widthPercent = percent
    }

    fun setFontSize(fontSize: Float) {
        this.fontSize = fontSize
        applyTextStyle()
    }

    fun setLocked(locked: Boolean) {
        this.locked = locked
        updateLayoutFlags()
        applyStyle()
        rootView?.let {
            windowManager?.updateViewLayout(it, layoutParams)
        }
    }

    fun setMode(mode: String) {
        this.lyricMode = mode
        setText(rawText)
    }

    fun setStyle(style: String) {
        this.stylePreset = style
        applyStyle()
    }

    fun setEmptyBehavior(behavior: String, fallbackText: String?) {
        this.emptyBehavior = behavior
        fallbackText?.let {
            this.fallbackText = it.ifEmpty { "CatMusicFree" }
        }
        setText(rawText)
    }

    fun setPaused(paused: Boolean) {
        this.paused = paused
        rootView?.alpha = if (paused) 0.58f else 1f
    }

    private fun updateLayoutFlags() {
        val baseFlags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
        layoutParams?.flags = if (locked) {
            baseFlags or WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
        } else {
            baseFlags
        }
    }

    private fun syncPositionFromLayout() {
        val params = layoutParams ?: return
        leftPercent = if (windowWidth - params.width > 0) {
            params.x / (windowWidth - params.width)
        } else {
            0.0
        }.coerceIn(0.0, 1.0)

        val viewHeight = rootView?.height ?: 0
        topPercent = if (windowHeight - viewHeight > 0) {
            params.y / (windowHeight - viewHeight)
        } else {
            0.0
        }.coerceIn(0.0, 1.0)
    }

    private fun snapToEdgeIfNeeded() {
        val params = layoutParams ?: return
        val target = rootView ?: return
        val manager = windowManager ?: return
        val maxX = (windowWidth - params.width).toInt().coerceAtLeast(0)
        val maxY = (windowHeight - target.height).toInt().coerceAtLeast(0)
        val threshold = dp(18)

        params.x = when {
            params.x < threshold -> 0
            maxX - params.x < threshold -> maxX
            else -> params.x
        }
        params.y = params.y.coerceIn(0, maxY)
        manager.updateViewLayout(target, params)
    }

    private fun emitPositionChanged() {
        val payload = com.facebook.react.bridge.Arguments.createMap().apply {
            putDouble("leftPercent", leftPercent)
            putDouble("topPercent", topPercent)
        }
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("StatusBarLyricPositionChanged", payload)
    }

    private fun emitLockedChanged() {
        val payload = com.facebook.react.bridge.Arguments.createMap().apply {
            putBoolean("locked", locked)
        }
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("StatusBarLyricLockedChanged", payload)
    }

    private fun applyStyle() {
        rootView?.background = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = dp(16).toFloat()
            setColor(Color.parseColor(rgba2argb(resolveBackgroundColor())))
            when {
                !locked -> setStroke(dp(1), Color.parseColor("#CC8FE8FF"))
                stylePreset == "neon" -> setStroke(dp(1), Color.parseColor("#88F2FF7A"))
            }
        }
        rootView?.alpha = if (paused) 0.58f else 1f
        applyTextStyle()
    }

    private fun applyTextStyle() {
        val parsedTextColor = Color.parseColor(rgba2argb(textColor))
        listOf(primaryTextView, secondaryTextView).forEachIndexed { index, view ->
            view?.setTextColor(parsedTextColor)
            view?.textSize = if (index == 0) fontSize else fontSize * 0.86f
            view?.setStrokeColor(resolveStrokeColor())
            view?.setStrokeWidth(if (stylePreset == "plain") 0f else dp(1).toFloat())
            view?.setShadowLayer(
                if (stylePreset == "plain") 0f else dp(4).toFloat(),
                0f,
                dp(1).toFloat(),
                Color.parseColor("#99000000"),
            )
        }
        secondaryTextView?.alpha = if (locked) 0.78f else 0.9f
        applyTextGravity()
    }

    private fun applyTextGravity() {
        primaryTextView?.gravity = align
        secondaryTextView?.gravity = align
        rootView?.gravity = align
    }

    private fun resolveBackgroundColor(): String {
        return when (stylePreset) {
            "plain" -> "#00000000"
            "dark" -> "#CC111318"
            "neon" -> "#66131510"
            else -> backgroundColor
        }
    }

    private fun resolveStrokeColor(): Int {
        return when (stylePreset) {
            "neon" -> Color.parseColor("#AA1B240D")
            "plain" -> Color.TRANSPARENT
            else -> Color.parseColor("#99000000")
        }
    }

    private fun resolveEmptyText(): String {
        return when (emptyBehavior) {
            "hide" -> ""
            "app" -> "CatMusicFree"
            else -> fallbackText
        }
    }

    private fun dp(value: Int): Int {
        return (value * reactContext.resources.displayMetrics.density).toInt()
    }
}

class StrokeTextView(context: Context) : TextView(context) {
    private var strokeColor = Color.TRANSPARENT
    private var strokeWidth = 0f

    fun setStrokeColor(color: Int) {
        strokeColor = color
        invalidate()
    }

    fun setStrokeWidth(width: Float) {
        strokeWidth = width
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        if (strokeWidth > 0f) {
            val originalColor = currentTextColor
            paint.style = Paint.Style.STROKE
            paint.strokeWidth = strokeWidth
            setTextColor(strokeColor)
            super.onDraw(canvas)
            paint.style = Paint.Style.FILL
            setTextColor(originalColor)
        }
        super.onDraw(canvas)
    }
}
