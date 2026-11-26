import { useContent, EDITABLE } from './store';
import { useRoute } from './router';
import { Search } from './components/Search';
import { DevPanel } from './components/DevPanel';
import { Home, About } from './views/Home';
import { AtlasPage } from './views/AtlasPage';
import { Library } from './views/Library';
import { PaperPage } from './views/PaperPage';
import { NotFound } from './views/NotFound';

function Header() {
  const { site } = useContent();
  const route = useRoute();
  const tab = route.name === 'library' || route.name === 'paper' ? 'library' : route.name === 'about' ? 'about' : 'atlases';
  return (
    <header className="site-header">
      <div className="wrap header-in">
        <div className="brand-block">
          <a className="brand" href="/">
            {site.title}
          </a>
          {site.tagline && <span className="tagline">{site.tagline}</span>}
          <nav className="site-nav" aria-label="Main">
            <a href="/" aria-current={tab === 'atlases' ? 'page' : undefined}>
              Atlases
            </a>
            <a href="/library" aria-current={tab === 'library' ? 'page' : undefined}>
              Library
            </a>
            <a href="/about" aria-current={tab === 'about' ? 'page' : undefined}>
              About
            </a>
          </nav>
        </div>
        <Search />
      </div>
    </header>
  );
}

export function App() {
  const route = useRoute();
  const { site } = useContent();
  const page = (() => {
    switch (route.name) {
      case 'home':
        return <Home />;
      case 'atlas':
        return <AtlasPage route={route} />;
      case 'library':
        return <Library route={route} />;
      case 'paper':
        return <PaperPage route={route} />;
      case 'about':
        return <About />;
      default:
        return <NotFound />;
    }
  })();
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main">{page}</main>
      <footer className="site-footer">
        <div className="wrap">
          <span>
            {site.title}
            {site.footer ? ` — ${site.footer}` : ''}
          </span>
        </div>
      </footer>
      {EDITABLE && <DevPanel />}
    </>
  );
}
