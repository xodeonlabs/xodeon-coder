import { useSiteCustomization } from '@/hooks/useSiteCustomization';

/** Mount inside <BrowserRouter> to apply admin theme + word overrides site-wide. */
export function SiteCustomizationApplier() {
  useSiteCustomization();
  return null;
}
