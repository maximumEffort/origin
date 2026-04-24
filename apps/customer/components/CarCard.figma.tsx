import figma from '@figma/code-connect'
import CarCard from './CarCard'

/**
 * Figma Code Connect — CarCard
 * Component node: 4:14
 *
 * TODO: once you've built CarCard variants in Figma, re-add props:
 *   props: {
 *     brand: figma.enum('Brand', { BYD: 'BYD', HAVAL: 'HAVAL', Chery: 'Chery', Geely: 'Geely', Jaecoo: 'Jaecoo', Omoda: 'Omoda' }),
 *     available: figma.boolean('Available'),
 *   }
 *   Then update example: ({ brand, available }) => <CarCard id="example" brand={brand} model="Atto 3" category="Electric SUV" monthlyAed={2400} imageUrl="" available={available} />
 */
figma.connect(
  CarCard,
  'https://www.figma.com/design/5gDVNgQd7RcuxNAlcTOObi/Origin-%E2%80%94-Car-Leasing?node-id=4:14',
  {
    example: () => (
      <CarCard
        id="example"
        brand="BYD"
        model="Atto 3"
        category="Electric SUV"
        monthlyAed={2400}
        imageUrl=""
        available={true}
      />
    ),
  }
)
