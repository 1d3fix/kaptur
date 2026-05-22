import {
  Outlet,
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router';
import { AppLayout } from '@/components/layout/AppLayout';
import { CaptureDetailPage } from '@/components/capture/CaptureDetailPage';
import { SessionCaptureView } from '@/components/capture/SessionCaptureView';
import { SessionsPage } from '@/components/session/SessionsPage';
import { SettingsPage } from '@/components/settings/SettingsPage';
import { TagsPage } from '@/components/tag/TagsPage';
import { FeaturesPage } from '@/components/features/FeaturesPage';
import { Toaster } from '@/components/ui/toaster';

export const rootRoute = createRootRoute({
  component: () => (
    <AppLayout>
      <Outlet />
      <Toaster />
    </AppLayout>
  ),
});

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/sessions' });
  },
});

export const sessionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sessions',
  component: SessionsPage,
});

export const sessionDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sessions/$slug',
  component: SessionCaptureView,
});

export const captureDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/captures/$id',
  component: CaptureDetailPage,
});

export const tagsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tags',
  component: TagsPage,
});

export const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
});

export const featuresRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/features',
  component: FeaturesPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  sessionsRoute,
  sessionDetailRoute,
  captureDetailRoute,
  tagsRoute,
  settingsRoute,
  featuresRoute,
]);

export const router = createRouter({
  routeTree,
  history: createHashHistory(),
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
