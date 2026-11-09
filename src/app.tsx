import { useEffect } from 'preact/hooks';
import { CookScreen } from './screens/cook';
import { DifferentScreen, DiscoverScreen } from './screens/explore';
import { FridgeScreen } from './screens/fridge';
import { RecipeScreen } from './screens/recipe';
import { SavedScreen } from './screens/saved';
import { useRoute, useStore } from './ui';

const TABS = [
  ['fridge', 'Fridge', 'M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM5 10h14M9 6v2M9 13v3'],
  ['different', 'Different', 'M4 7h11l-3-3M20 17H9l3 3'],
  ['discover', 'Discover', 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm3.5 5.5-2 5-5 2 2-5z'],
  ['saved', 'Saved', 'M12 17.3 6.2 21l1.6-6.6L3 9.8l6.7-.6L12 3l2.3 6.2 6.7.6-4.8 4.6 1.6 6.6z'],
] as const;

export function App() {
  const route = useRoute();
  const s = useStore();
  useEffect(() => { window.scrollTo(0, 0); }, [route]);
  const tab = route.name === 'recipe' || route.name === 'cook' ? null : route.name;
  return (
    <>
      <main>
        {route.name === 'fridge' && <FridgeScreen />}
        {route.name === 'different' && <DifferentScreen />}
        {route.name === 'discover' && <DiscoverScreen />}
        {route.name === 'saved' && <SavedScreen />}
        {route.name === 'recipe' && <RecipeScreen id={route.id} />}
        {route.name === 'cook' && <CookScreen id={route.id} />}
      </main>
      {route.name !== 'cook' && (
        <nav class="tabbar">
          {TABS.map(([id, label, d]) => (
            <a href={`#/${id}`} class={tab === id ? 'on' : ''} aria-current={tab === id ? 'page' : undefined}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>
              <span>{label}{id === 'saved' && s.plans.length > 0 ? ` (${s.plans.length})` : ''}</span>
            </a>
          ))}
        </nav>
      )}
    </>
  );
}
