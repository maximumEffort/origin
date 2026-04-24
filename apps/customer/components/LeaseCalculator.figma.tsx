import figma from '@figma/code-connect'
import LeaseCalculator from './LeaseCalculator'

/**
 * Figma Code Connect — LeaseCalculator
 * Component node: 4:9
 *
 * TODO: once you've built LeaseCalculator variants in Figma, re-add props:
 *   props: {
 *     vatVisible: figma.boolean('VAT shown'),
 *     state: figma.enum('State', { Default: 'default', Loading: 'loading', 'Result shown': 'result' }),
 *   }
 *   Then update example: ({ vatVisible, state }) => <LeaseCalculator baseMonthlyAed={2400} />
 */
figma.connect(
  LeaseCalculator,
  'https://www.figma.com/design/5gDVNgQd7RcuxNAlcTOObi/Origin-%E2%80%94-Car-Leasing?node-id=4:9',
  {
    example: () => <LeaseCalculator baseMonthlyAed={2400} />,
  }
)
