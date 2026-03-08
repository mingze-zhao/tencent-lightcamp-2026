import ToastHost from './components/ui/ToastHost';
import AppShell from './app/AppShell';
import SettingsPanel from './features/settings/SettingsPanel';
import { AppStoreProvider } from './state/appStore';

export default function App() {
  return (
    <AppStoreProvider>
      <AppShell />
      <SettingsPanel />
      <ToastHost />
    </AppStoreProvider>
  );
}
