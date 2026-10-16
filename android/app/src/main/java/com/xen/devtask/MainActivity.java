package com.xen.devtask;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.autofill.AutofillManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private WebView appWebView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && getBridge() != null) {
            appWebView = getBridge().getWebView();

            if (appWebView != null) {
                appWebView.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_YES);
                appWebView.addJavascriptInterface(this, "DevTaskAutofill");
            }
        }
    }

    @JavascriptInterface
    public void commitAutofill() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        runOnUiThread(() -> {
            AutofillManager autofillManager = getSystemService(AutofillManager.class);

            if (autofillManager != null && autofillManager.isEnabled()) {
                autofillManager.commit();
            }
        });
    }
}
