import figma from '@figma/code-connect'
import Footer from './Footer'

/**
 * Figma Code Connect — Footer
 * Component node: 4:29
 *
 * TODO: once you've built Footer variants in Figma, re-add props:
 *   props: {
 *     theme: figma.enum('Theme', { 'Dark navy': 'dark', Light: 'light' }),
 *   }
 *   Then update example: ({ theme }) => <Footer />
 */
figma.connect(
  Footer,
  'https://www.figma.com/design/5gDVNgQd7RcuxNAlcTOObi/Origin-%E2%80%94-Car-Leasing?node-id=4:29',
  {
    example: () => <Footer />,
  }
)
