import figma from '@figma/code-connect'
import Navbar from './Navbar'

/**
 * Figma Code Connect — Navbar
 * Component node: 4:4
 *
 * TODO: once you've built Navbar variants in Figma, re-add props:
 *   props: {
 *     transparent: figma.boolean('Transparent background'),
 *   }
 *   Then update example: ({ transparent }) => <Navbar />
 */
figma.connect(
  Navbar,
  'https://www.figma.com/design/5gDVNgQd7RcuxNAlcTOObi/Origin-%E2%80%94-Car-Leasing?node-id=4:4',
  {
    example: () => <Navbar />,
  }
)
