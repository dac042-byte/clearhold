import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { supabaseAdmin } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    // Get auth token from request headers
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create a Supabase client with the user's token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    )

    // Verify user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check usage limits
    const today = new Date().toISOString().split('T')[0]
    const { data: usageData } = await supabaseAdmin
      .from('daily_usage')
      .select('usage_count')
      .eq('user_id', user.id)
      .eq('usage_date', today)
      .single()

    const currentUsage = usageData?.usage_count || 0
    const isSubscribed = profile.subscription_status === 'active'

    if (!isSubscribed && currentUsage >= 5) {
      return NextResponse.json(
        { error: 'Daily usage limit reached. Please subscribe for unlimited access.' },
        { status: 429 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { thought, classification, chosen_distortions, evidence_choice } = body

    if (!thought || !classification || !chosen_distortions || !evidence_choice) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Call OpenAI API
    const systemPrompt = `You are a neutral CBT (Cognitive Behavioral Therapy) analysis tool. Your role is to help users examine their thoughts objectively without providing diagnosis or treatment.

Given a user's thought and their preliminary analysis, provide a structured response with exactly these four components:

1. type: A brief, neutral label for what this thought represents (e.g., "Absolutist belief about social perception" or "Future-oriented worry")

2. distortions: An array of 1-3 specific cognitive distortions present. Use the user's selections as hints but correct them if inaccurate. Choose from: Catastrophizing, Mind reading, All-or-nothing, Emotional reasoning, Should statements, Fortune telling, Personalization, Overgeneralization.

3. assumptions_vs_facts: A concise contrast showing what is assumed versus what is observable. Format as "Assumed: [assumption]. Observable: [facts]."

4. grounded_reframe: One clear, neutral reframe that acknowledges reality without invalidating the concern. Focus on what can be known versus what is projected. Keep it concise and objective.

Guidelines:
- Use neutral, non-clinical language
- Do not diagnose or provide medical advice
- Be concise (each section should be 1-3 sentences max)
- Focus on observable facts vs interpretations
- Provide reassurance through objectivity, not dismissal

Return ONLY valid JSON with these exact keys: type, distortions, assumptions_vs_facts, grounded_reframe`

    const userPrompt = `Thought: "${thought}"

User's classification: ${classification}
User's selected distortions: ${chosen_distortions.join(', ')}
Evidence of objective truth: ${evidence_choice}

Provide your analysis in the exact JSON format specified.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    })

    const aiResponseText = completion.choices[0].message.content
    if (!aiResponseText) {
      throw new Error('No response from AI')
    }

    const aiResponse = JSON.parse(aiResponseText)

    // Validate response structure
    if (
      !aiResponse.type ||
      !Array.isArray(aiResponse.distortions) ||
      !aiResponse.assumptions_vs_facts ||
      !aiResponse.grounded_reframe
    ) {
      throw new Error('Invalid AI response structure')
    }

    // Save reflection to history
    await supabaseAdmin.from('reflections').insert({
      user_id: user.id,
      thought,
      classification,
      chosen_distortions,
      evidence_choice,
      ai_response: aiResponse,
    })

    // Update usage count
    if (usageData) {
      await supabaseAdmin
        .from('daily_usage')
        .update({ usage_count: currentUsage + 1 })
        .eq('user_id', user.id)
        .eq('usage_date', today)
    } else {
      await supabaseAdmin.from('daily_usage').insert({
        user_id: user.id,
        usage_date: today,
        usage_count: 1,
      })
    }

    // Increment clarity points
    await supabaseAdmin
      .from('user_profiles')
      .update({ clarity_points: profile.clarity_points + 1 })
      .eq('id', user.id)

    return NextResponse.json(aiResponse)
  } catch (error: any) {
    console.error('Reflect API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
