package com.btmedya.admin;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.SslErrorHandler;
import android.net.http.SslError;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceError;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.view.View;

public final class MainActivity extends Activity {
    private static final String START_URL = "https://btmedya.com.tr/admin/giris/";
    private static final String HOST = "btmedya.com.tr";
    private static final String ACCESS_HOST = "cloudflareaccess.com";
    private static final int FILE_CHOOSER = 7001;
    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        webView = new WebView(this);
        setContentView(webView);
        configureWebView();
        if (state == null) webView.loadUrl(START_URL); else webView.restoreState(state);
    }

    private void configureWebView() {
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setMediaPlaybackRequiresUserGesture(true);
        if (Build.VERSION.SDK_INT >= 26) s.setSafeBrowsingEnabled(true);
        if (Build.VERSION.SDK_INT >= 21) {
            s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
            CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);
        }
        CookieManager.getInstance().setAcceptCookie(true);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) { return routeUrl(view, request.getUrl()); }
            @Override public boolean shouldOverrideUrlLoading(WebView view, String url) { return routeUrl(view, Uri.parse(url)); }
            @Override public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) { handler.cancel(); }
            @Override public void onReceivedError(WebView view, WebResourceRequest req, WebResourceError error) {
                if (req.isForMainFrame()) view.loadDataWithBaseURL(null, "<html><body style='background:#05080c;color:#eef3f7;font:16px sans-serif;padding:32px'><h2>Bağlantı kurulamadı</h2><p>BTMEDYA Admin sunucusuna erişilemiyor. İnternet bağlantısını kontrol edip tekrar deneyin.</p></body></html>", "text/html", "UTF-8", null);
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent intent = params.createIntent();
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                try { startActivityForResult(intent, FILE_CHOOSER); } catch (ActivityNotFoundException e) { fileCallback = null; callback.onReceiveValue(null); }
                return true;
            }
        });
    }

    private boolean routeUrl(WebView view, Uri uri) {
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase();
        if ("https".equals(scheme) && (host.equals(HOST) || host.endsWith("." + HOST) || host.equals(ACCESS_HOST) || host.endsWith("." + ACCESS_HOST))) return false;
        if ("http".equals(scheme) && host.equals(HOST)) {
            view.loadUrl("https://" + uri.getHost() + uri.getPath() + (uri.getQuery() == null ? "" : "?" + uri.getQuery()));
            return true;
        }
        try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (ActivityNotFoundException ignored) {}
        return true;
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_CHOOSER || fileCallback == null) return;
        Uri[] result = resultCode == RESULT_OK && data != null ? WebChromeClient.FileChooserParams.parseResult(resultCode, data) : null;
        fileCallback.onReceiveValue(result);
        fileCallback = null;
    }

    @Override protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override public void onBackPressed() {
        if (webView.canGoBack()) webView.goBack(); else super.onBackPressed();
    }

    @Override protected void onDestroy() {
        if (fileCallback != null) fileCallback.onReceiveValue(null);
        if (webView != null) { webView.stopLoading(); webView.destroy(); }
        super.onDestroy();
    }
}
