import figma from '@figma/code-connect'
import TrustBadges from './TrustBadges'

/**
 * Figma Code Connect — TrustBadges
 * Component node: 4:19
 *
 * TODO: once you've built TrustBadges variants in Figma, re-add props:
 *   props: {
 *     layout: figma.enum('Layout', { Row: 'row', Grid: 'grid' }),
 *   }
 *   Then update example: ({ layout }) => <TrustBadges />
 */
figma.connect(
  TrustBadges,
  'https://www.figma.com/design/5gDVNgQd7RcuxNAlcTOObi/Origin-%E2%80%94-Car-Leasing?node-id=4:19',
  {
    example: () => <TrustBadges />,
  }
)
