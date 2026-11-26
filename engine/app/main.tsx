import { createRoot } from 'react-dom/client';
import '@fontsource/cormorant-garamond/500-italic.css';
import '@fontsource/cormorant-garamond/600-italic.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/jetbrains-mono/300.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import 'katex/dist/katex.min.css';
import './styles/app.css';
// Look and feel lives with the content, so a human can restyle without touching engine/.
import '../../human/theme/tokens.css';
import '../../human/theme/custom.css';
import { App } from './App';
import { installLinkInterceptor } from './router';

installLinkInterceptor();
createRoot(document.getElementById('root')!).render(<App />);
