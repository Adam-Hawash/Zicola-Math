import type { Metadata } from 'next'
import { GeometryLaws } from '@/components/landing/GeometryLaws'

export var metadata: Metadata = {
  title: 'Geometry Laws | Zicola In Math',
  description:
    'All geometry laws on one page: area and perimeter of every shape, volumes and surface areas, and the Pythagorean theorem — from the Zicola In Math platform.',
}

export default function GeometryLawsPage() {
  return <GeometryLaws />
}
