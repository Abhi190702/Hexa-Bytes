import { MapView } from '@/components/map/MapView';
import { MapChrome } from '@/components/layout/MapChrome';
import { Legend } from '@/components/layout/Legend';
import { Sidebar } from '@/components/layout/Sidebar';
import { SplashScreen } from '@/components/layout/SplashScreen';

// The live map dashboard. The research landing lives at `/`.
// Light theme: clearest backdrop for reading the ESI heatmap + chrome.
export default function MapPage() {
  return (
    <main className="fixed inset-0 overflow-hidden">
      <MapView />
      <MapChrome />
      <Legend />
      <Sidebar />
      <SplashScreen />
    </main>
  );
}
