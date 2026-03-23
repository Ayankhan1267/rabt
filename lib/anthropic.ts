/**
 * Creates an Anthropic client using config from DB (hq_settings) first, then env vars.
 * Always use this instead of `new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })`
 */
import Anthropic from '@anthropic-ai/sdk'
import { getConfig } from './config'

export async function getAnthropicClient(): Promise<Anthropic> {
  const cfg = await getConfig()
  return new Anthropic({ apiKey: cfg.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || '' })
}
