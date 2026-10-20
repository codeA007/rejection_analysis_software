import {
  HomeIcon,
  ProductionIcon,
  RejectionIcon,
  AnalysisIcon,
  YieldIcon,
  ElectricityIcon,
  SettingsIcon,
  PartsIcon,
} from '../components/icons/NavIcons'

export const NAV_ITEMS = [
  { id: 'home', label: 'Dashboard', path: '/', pageTitle: 'Dashboard', icon: HomeIcon },
  {
    id: 'parts',
    label: 'Parts',
    path: '/parts',
    pageTitle: 'Parts Catalog',
    icon: PartsIcon,
  },
  {
    id: 'production',
    label: 'Production',
    path: '/production',
    pageTitle: 'Production Entry',
    icon: ProductionIcon,
  },
  {
    id: 'rejections',
    label: 'Rejections',
    path: '/rejections',
    pageTitle: 'Rejection Entry',
    icon: RejectionIcon,
  },
  {
    id: 'yield',
    label: 'Yield',
    path: '/yield',
    pageTitle: 'Furnace Yield',
    icon: YieldIcon,
  },
  {
    id: 'electricity',
    label: 'Electricity',
    path: '/electricity',
    pageTitle: 'Melting Electricity',
    icon: ElectricityIcon,
  },
  {
    id: 'monthly',
    label: 'Monthly Analysis',
    path: '/monthly',
    pageTitle: 'Monthly Analysis',
    icon: AnalysisIcon,
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    pageTitle: 'Settings',
    icon: SettingsIcon,
  },
]

export function findNavPageTitle(pathname) {
  for (const item of NAV_ITEMS) {
    if (item.path === '/' ? pathname === '/' : pathname.startsWith(item.path)) {
      return item.pageTitle ?? item.label
    }
  }
  return 'Foundry Rejection Tracker'
}
