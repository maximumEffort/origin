import figma from '@figma/code-connect'
import WhatsAppButton from './WhatsAppButton'

/**
 * Figma Code Connect — WhatsAppButton
 * Component node: 4:24
 *
 * TODO: once you've built WhatsAppButton variants in Figma, re-add props:
 *   props: {
 *     state: figma.enum('State', { Default: 'default', Hover: 'hover', 'With tooltip': 'tooltip' }),
 *   }
 *   Then update example: ({ state }) => <WhatsAppButton />
 */
figma.connect(
  WhatsAppButton,
  'https://www.figma.com/design/5gDVNgQd7RcuxNAlcTOObi/Origin-%E2%80%94-Car-Leasing?node-id=4:24',
  {
    example: () => <WhatsAppButton />,
  }
)
