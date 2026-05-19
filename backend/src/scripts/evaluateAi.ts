import '../config/env';
import { processOrderIntent } from '../services/ai.service';
import type { MatchedMenuItem } from '../services/rag.service';
import type { ChatMessage, ChatRequest, OrderAction } from '../types/schema';

/** Fixed menu slice used as RETRIEVED CONTEXT for all eval cases (no Supabase RAG). */
const MOCK_RETRIEVED_ITEMS: MatchedMenuItem[] = [
  {
    id: '101',
    name: 'Truffle Burger',
    price: 14.99,
    category: 'Burgers & Sandwiches',
    ingredients: ['beef patty', 'truffle aioli', 'gruyere', 'brioche bun'],
    allergens: ['gluten', 'dairy', 'eggs'],
  },
  {
    id: '102',
    name: 'Truffle Fries',
    price: 6.99,
    category: 'Sides',
    ingredients: ['russet potatoes', 'truffle oil', 'parmesan'],
    allergens: ['dairy'],
  },
  {
    id: '103',
    name: 'Berry Bliss Iced Tea',
    price: 5.0,
    category: 'Beverages',
    ingredients: ['black tea', 'mixed berries', 'basil'],
    allergens: [],
  },
];

interface EvalTestCase {
  name: string;
  messages: ChatMessage[];
  currentCart: ChatRequest['currentCart'];
  expectedActions: OrderAction[];
}

const TEST_CASES: EvalTestCase[] = [
  {
    name: 'direct_order',
    messages: [{ role: 'user', content: 'Please add one Truffle Burger to my cart.' }],
    currentCart: [],
    expectedActions: [{ actionType: 'ADD', itemId: '101', quantity: 1 }],
  },
  {
    name: 'vague_order',
    messages: [{ role: 'user', content: 'I want a sandwich.' }],
    currentCart: [],
    expectedActions: [],
  },
  {
    name: 'hallucination',
    messages: [{ role: 'user', content: 'Add a black coffee to my order.' }],
    currentCart: [],
    expectedActions: [],
  },
  {
    name: 'change_of_mind',
    messages: [
      {
        role: 'user',
        content:
          "Add the truffle burger — actually never mind, don't add anything.",
      },
    ],
    currentCart: [],
    expectedActions: [],
  },
];

function normalizeAction(action: OrderAction): OrderAction {
  return {
    actionType: action.actionType,
    itemId: action.itemId != null ? String(action.itemId) : null,
    quantity: action.quantity,
  };
}

function actionsEqual(actual: OrderAction[], expected: OrderAction[]): boolean {
  if (actual.length !== expected.length) return false;
  return actual.every((action, index) => {
    const a = normalizeAction(action);
    const e = normalizeAction(expected[index]!);
    return (
      a.actionType === e.actionType &&
      a.itemId === e.itemId &&
      a.quantity === e.quantity
    );
  });
}

function formatActions(actions: OrderAction[]): string {
  return JSON.stringify(actions.map(normalizeAction), null, 2);
}

async function runEval(): Promise<void> {
  console.log('Running AI order intent evaluation...\n');
  console.log(`Mock retrieved context: ${MOCK_RETRIEVED_ITEMS.map((i) => i.name).join(', ')}\n`);

  let passed = 0;

  for (const testCase of TEST_CASES) {
    process.stdout.write(`[${testCase.name}] `);

    try {
      const result = await processOrderIntent(
        { messages: testCase.messages, currentCart: testCase.currentCart },
        { retrievedItems: MOCK_RETRIEVED_ITEMS }
      );

      const ok = actionsEqual(result.actions, testCase.expectedActions);

      if (ok) {
        passed += 1;
        console.log('PASS');
      } else {
        console.log('FAIL');
        console.log('  Expected actions:', formatActions(testCase.expectedActions));
        console.log('  Actual actions:  ', formatActions(result.actions));
      }

      console.log(`  Response: "${result.conversationalResponse}"\n`);
    } catch (err) {
      console.log('ERROR');
      console.log(`  ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }

  console.log('─'.repeat(48));
  console.log(`Results: ${passed}/${TEST_CASES.length} passed`);

  if (passed !== TEST_CASES.length) {
    process.exit(1);
  }
}

runEval().catch((err) => {
  console.error(err);
  process.exit(1);
});
