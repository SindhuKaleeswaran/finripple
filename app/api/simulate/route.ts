import { NextResponse } from 'next/server'

import { getFinancialIntelligenceEngine } from '@/lib/financial-intelligence/financial-intelligence-engine'

export const runtime = 'nodejs'

type SimulationRequestBody = {
  scenario?: unknown
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SimulationRequestBody

    if (typeof body.scenario !== 'string' || body.scenario.trim().length === 0) {
      return NextResponse.json({ error: 'A non-empty scenario string is required.' }, { status: 400 })
    }

    const scenario = body.scenario.trim()
    const simulation = await getFinancialIntelligenceEngine().simulate(scenario)

    return NextResponse.json(simulation)
  } catch (error) {
    console.error('Failed to simulate ripple.', error)

    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 })
    }

    return NextResponse.json({ error: 'Failed to simulate ripple.' }, { status: 500 })
  }
}
