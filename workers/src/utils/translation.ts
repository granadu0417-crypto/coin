/**
 * Translation utility using Cloudflare Workers AI
 */

export interface TranslationEnv {
  AI: any; // Cloudflare AI binding
}

/**
 * Translate text from English to Korean using Cloudflare AI
 * @param text English text to translate
 * @param env Worker environment with AI binding
 * @returns Translated Korean text
 */
export async function translateToKorean(
  text: string,
  env: TranslationEnv
): Promise<string> {
  try {
    // Skip translation if text is empty or too short
    if (!text || text.trim().length < 3) {
      return text;
    }

    // Use Cloudflare AI translation model
    const response = await env.AI.run('@cf/meta/m2m100-1.2b', {
      text: text,
      source_lang: 'english',
      target_lang: 'korean',
    });

    return response.translated_text || text;
  } catch (error) {
    console.error('Translation error:', error);
    // Return original text if translation fails
    return text;
  }
}

/**
 * Batch translate multiple texts
 * @param texts Array of English texts to translate
 * @param env Worker environment with AI binding
 * @returns Array of translated Korean texts
 */
export async function batchTranslate(
  texts: string[],
  env: TranslationEnv
): Promise<string[]> {
  const translations = await Promise.allSettled(
    texts.map((text) => translateToKorean(text, env))
  );

  return translations.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      console.error(`Translation failed for text ${index}:`, result.reason);
      return texts[index]; // Return original on failure
    }
  });
}
