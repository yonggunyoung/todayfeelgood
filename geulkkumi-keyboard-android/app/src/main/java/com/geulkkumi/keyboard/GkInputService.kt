package com.geulkkumi.keyboard

import android.annotation.SuppressLint
import android.content.Context
import android.inputmethodservice.InputMethodService
import android.view.View
import android.view.inputmethod.InputMethodManager
import android.webkit.JavascriptInterface
import android.webkit.WebView

/**
 * 글꾸미 커스텀 키보드(IME).
 * 키보드 본체를 WebView로 채우고, 메인 앱의 순수 엔진/데이터(assets/web)를 그대로 로드한다.
 * 사용자가 패널에서 글씨를 고르면 JS가 Gk.commit(text)을 호출 → commitText로 현재 입력창에 직접 입력.
 */
class GkInputService : InputMethodService() {

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreateInputView(): View {
        val web = WebView(this)
        web.settings.apply {
            javaScriptEnabled = true
            // assets의 ESM 모듈(import)을 file://에서 로드하려면 아래 둘이 필요.
            allowFileAccess = true
            @Suppress("DEPRECATION")
            allowFileAccessFromFileURLs = true
            @Suppress("DEPRECATION")
            allowUniversalAccessFromFileURLs = true
        }
        web.addJavascriptInterface(Bridge(), "Gk")
        web.loadUrl("file:///android_asset/web/keyboard.html")
        return web
    }

    inner class Bridge {
        /** 선택한 멋글씨/이모티콘을 현재 입력창 커서에 직접 입력(복붙 불필요). */
        @JavascriptInterface
        fun commit(text: String) {
            currentInputConnection?.commitText(text, 1)
        }

        /** 시스템 키보드 선택창 열기(평소 타이핑 키보드로 복귀). */
        @JavascriptInterface
        fun switchKeyboard() {
            (getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager).showInputMethodPicker()
        }

        /** 백스페이스(선택). */
        @JavascriptInterface
        fun backspace() {
            currentInputConnection?.deleteSurroundingText(1, 0)
        }
    }
}
