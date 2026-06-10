import Anthropic from '@anthropic-ai/sdk';

// AI 변환 파이프라인: 원문(자막/본문/텍스트) → 표준 레시피 스키마.
// API 키가 있으면 Claude 호출, 없으면 데모(목업) 변환으로 흐름을 보여준다.

const API_KEY_STORAGE = 'recipebook-api-key';

export function getApiKey() {
  return localStorage.getItem(API_KEY_STORAGE) ?? '';
}

export function setApiKey(key) {
  if (key) localStorage.setItem(API_KEY_STORAGE, key);
  else localStorage.removeItem(API_KEY_STORAGE);
}

const RECIPE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: '레시피 이름 (한국어)' },
    servings: { type: 'string', description: '몇 인분 (예: "2인분"). 알 수 없으면 빈 문자열' },
    totalTimeMinutes: {
      type: ['integer', 'null'],
      description: '총 조리 시간(분). 알 수 없으면 null',
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
      description: '분류 태그 2~4개 (예: 한식, 자취요리, 다이어트)',
    },
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          amount: { type: 'string', description: '분량 (예: "2큰술"). 알 수 없으면 빈 문자열' },
        },
        required: ['name', 'amount'],
        additionalProperties: false,
      },
    },
    steps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string', description: '조리 단계 설명 (한국어, 간결하게)' },
          timestampSeconds: {
            type: ['integer', 'null'],
            description: '영상 속 해당 단계 시작 시점(초). 원문에 타임스탬프가 없으면 null',
          },
        },
        required: ['text', 'timestampSeconds'],
        additionalProperties: false,
      },
    },
  },
  required: ['title', 'servings', 'totalTimeMinutes', 'tags', 'ingredients', 'steps'],
  additionalProperties: false,
};

export async function convertToRecipe({ sourceType, title, content }) {
  const apiKey = getApiKey();
  if (!apiKey) return mockConvert({ sourceType, title, content });

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const sourceLabel =
    sourceType === 'youtube' ? '유튜브 요리 영상의 자막/설명' : sourceType === 'web' ? '웹페이지 본문' : '사용자가 붙여넣은 텍스트';

  const response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 8192,
    system:
      '너는 요리 레시피 구조화 전문가다. 주어진 원문에서 레시피를 추출해 스키마에 맞춰 정리한다. ' +
      '원문에 없는 정보를 지어내지 말고, 알 수 없는 값은 빈 문자열이나 null로 둔다. 모든 텍스트는 한국어로 작성한다.',
    output_config: { format: { type: 'json_schema', schema: RECIPE_SCHEMA } },
    messages: [
      {
        role: 'user',
        content: `다음은 ${sourceLabel}입니다.${title ? ` 제목: "${title}"` : ''}\n\n---\n${content}\n---\n\n이 내용에서 레시피를 추출해 주세요.`,
      },
    ],
  });

  const block = response.content.find((b) => b.type === 'text');
  return JSON.parse(block.text);
}

// 키 없이 화면 흐름을 검증하기 위한 데모 변환
function mockConvert({ title }) {
  return new Promise((resolve) =>
    setTimeout(
      () =>
        resolve({
          title: title || '데모 레시피 (API 키를 설정하면 실제 AI 변환이 됩니다)',
          servings: '2인분',
          totalTimeMinutes: 20,
          tags: ['데모', '자취요리'],
          ingredients: [
            { name: '재료 예시 1', amount: '1개' },
            { name: '재료 예시 2', amount: '2큰술' },
            { name: '재료 예시 3', amount: '약간' },
          ],
          steps: [
            { text: '데모 단계입니다. 설정에서 Claude API 키를 입력하면 실제 원문에서 재료와 단계를 추출합니다.', timestampSeconds: null },
            { text: '재료를 손질합니다.', timestampSeconds: 30 },
            { text: '팬에 볶다가 양념을 넣고 마무리합니다.', timestampSeconds: 95 },
          ],
        }),
      800
    )
  );
}
