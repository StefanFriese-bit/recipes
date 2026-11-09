import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app';
import './styles.css';

// An iPhone shows a button's pressed look only on a page that listens for touches.
document.addEventListener('touchstart', () => {}, { passive: true });
render(<App />, document.getElementById('app')!);
// Works offline once opened; a new version installs itself in the background and is used from the next start.
registerSW({ immediate: true });
// Ask the phone not to clear the app's data when space runs low.
void navigator.storage?.persist?.().catch(() => undefined);
