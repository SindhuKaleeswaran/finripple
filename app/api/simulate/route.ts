import { NextResponse } from 'next/server'

import { getRelationshipsFromSource } from '@/lib/relationship-repository'
import { simulateRipple } from '@/lib/ripple-engine'

export const runtime = 'nodejs'

type SimulationRequestBody = {
  scenario?: unknown
}

function mapScenarioToInputs(scenario: string) {
  const normalizedScenario = scenario.toLowerCase()

  if (normalizedScenario.includes('rare earth') || normalizedScenario.includes('china')) {
    return {
      startEntityIds: ['CHINA', 'RARE_EARTHS'],
      initialSeverity: 100,
    }
  }

  if (
    normalizedScenario.includes('taiwan') ||
    normalizedScenario.includes('earthquake') ||
    normalizedScenario.includes('semiconductor')
  ) {
    return {
      startEntityIds: ['TAIWAN', 'TSMC', 'SEMICONDUCTORS'],
      initialSeverity: 100,
    }
  }

  if (normalizedScenario.includes('oil')) {
    return {
      startEntityIds: ['OIL'],
      initialSeverity: 100,
    }
  }

  return {
    startEntityIds: ['QQQ'],
    initialSeverity: 70,
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SimulationRequestBody

    if (typeof body.scenario !== 'string' || body.scenario.trim().length === 0) {
      return NextResponse.json({ error: 'A non-empty scenario string is required.' }, { status: 400 })
    }

    const scenario = body.scenario.trim()
    const { startEntityIds, initialSeverity } = mapScenarioToInputs(scenario)
    const result = await simulateRipple({
      startEntityIds,
      initialSeverity,
      maxDepth: 3,
      decayFactor: 0.85,
      getRelationships: getRelationshipsFromSource,
    })

    return NextResponse.json({
      scenario,
      startEntityIds,
      result,
    })
  } catch (error) {
    console.error('Failed to simulate ripple.', error)

    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 })
    }

    return NextResponse.json({ error: 'Failed to simulate ripple.' }, { status: 500 })
  }
}
