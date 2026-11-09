import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request) {
  try {
    const { image } = await request.json();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a logistics assistant. Analyze the image of a household item. Return ONLY a JSON object with these exact keys: 'title' (string), 'description' (string), 'size' (string: 'Small', 'Medium', 'Large'), 'disposition' (string: 'Sell', 'Recycle', 'Donate'), 'item_type' (string, choose best fit: 'Furniture', 'Cutlery', 'Appliances', 'Electronics', 'Clothes', 'Decor', 'Other')."
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Classify this item." },
            { type: "image_url", image_url: { url: image } }
          ]
        }
      ],
      response_format: { type: "json_object" }
    });
    return NextResponse.json(JSON.parse(response.choices[0].message.content));
  } catch (error) {
    return NextResponse.json({ error: "Failed to classify image" }, { status: 500 });
  }
}