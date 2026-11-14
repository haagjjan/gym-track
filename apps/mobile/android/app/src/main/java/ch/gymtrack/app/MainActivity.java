package ch.gymtrack.app;

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // After super.onCreate: before it an action bar appears; without it the
        // WebView reports no safe-area insets (Capacitor SystemBars).
        EdgeToEdge.enable(this);
    }
}
