export interface HiddenTestResult {
  passed: boolean
  summary: string
  score: number
}

const FORCE_RESULT = (process.env.MOCK_HIDDEN_TEST_FORCE ?? '').trim().toLowerCase()

const SABOTAGE_PATTERNS = [
  'while(true)',
  'for(;;)',
  'todo sabotage',
  'throw new Error("sabotage")',
  'process.exit(',
]

export class HiddenTestService {
  public evaluate(activeCode: string[]): HiddenTestResult {
    if (FORCE_RESULT === 'pass') {
      return { passed: true, summary: 'Forced hidden test pass by env override.', score: 100 }
    }

    if (FORCE_RESULT === 'fail') {
      return { passed: false, summary: 'Forced hidden test failure by env override.', score: 0 }
    }

    const merged = activeCode.join('\n').toLowerCase()
    if (merged.length === 0) {
      return { passed: false, summary: 'No code submitted by active players.', score: 0 }
    }

    const hasSabotage = SABOTAGE_PATTERNS.some((token) => merged.includes(token))
    const hasReturn = /\breturn\b/.test(merged)
    const hasFunction = /\bfunction\b|=>/.test(merged)

    let score = 0
    if (hasFunction) score += 40
    if (hasReturn) score += 40
    if (!hasSabotage) score += 20

    const passed = score >= 80 && !hasSabotage
    const summary = passed
      ? 'Hidden tests passed on aggregate active code.'
      : 'Hidden tests failed: suspicious or incomplete implementation detected.'

    return { passed, summary, score }
  }
}
