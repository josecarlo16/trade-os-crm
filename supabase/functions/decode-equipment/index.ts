import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { modelNumber, serialNumber, zipCode, email, isDfw, imageBase64 } = await req.json();

    // Either model number or image is required
    if (!modelNumber && !imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Model number or image is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Decoding equipment:', { 
      hasModelNumber: !!modelNumber, 
      hasSerial: !!serialNumber, 
      hasImage: !!imageBase64,
      zipCode 
    });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let extractedModelNumber = modelNumber;
    let extractedSerialNumber = serialNumber;
    let imageAnalysisResult: Record<string, unknown> | null = null;

    // If image is provided, use vision to extract model/serial first
    if (imageBase64) {
      console.log('Processing image with vision model...');
      
      const visionPrompt = `You are an expert HVAC technician analyzing a data plate image. 

Extract the following information from this HVAC equipment data plate image:
1. Model Number - Look for "MODEL", "MOD", "M/N" labels
2. Serial Number - Look for "SERIAL", "SER", "S/N" labels
3. Any other visible specs (tonnage, refrigerant, voltage, etc.)

Return ONLY a valid JSON object with these fields:
{
  "model_number": "The model number found on the plate",
  "serial_number": "The serial number found on the plate",
  "brand": "The manufacturer if visible",
  "tonnage": "Capacity if visible (e.g., '3 Ton')",
  "refrigerant": "Refrigerant type if visible (e.g., 'R-410A')",
  "voltage": "Voltage if visible",
  "additional_specs": "Any other important specs visible"
}

If you cannot read a value clearly, return null for that field.
Return ONLY the JSON object, no additional text.`;

      const visionResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: visionPrompt },
                { 
                  type: 'image_url', 
                  image_url: { url: imageBase64 }
                }
              ]
            }
          ],
        }),
      });

      if (!visionResponse.ok) {
        const errorText = await visionResponse.text();
        console.error('Vision API error:', visionResponse.status, errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to analyze image. Please try manual entry.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const visionData = await visionResponse.json();
      console.log('Vision response:', JSON.stringify(visionData, null, 2));

      // Parse the vision result
      const visionContent = visionData.choices?.[0]?.message?.content;
      if (visionContent) {
        try {
          const jsonMatch = visionContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            imageAnalysisResult = JSON.parse(jsonMatch[0]);
            extractedModelNumber = imageAnalysisResult?.model_number || modelNumber;
            extractedSerialNumber = imageAnalysisResult?.serial_number || serialNumber;
            console.log('Extracted from image:', { extractedModelNumber, extractedSerialNumber });
          }
        } catch (e) {
          console.error('Failed to parse vision result:', e);
        }
      }

      if (!extractedModelNumber) {
        return new Response(
          JSON.stringify({ 
            error: 'Could not read model number from image. Please enter it manually.',
            partial_result: imageAnalysisResult
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Build the prompt for decoding
    const decodePrompt = `You are an expert HVAC equipment decoder. Given the following model number and serial number, decode as much information as possible about this HVAC equipment.

Model Number: ${extractedModelNumber}
Serial Number: ${extractedSerialNumber || 'Not provided'}

Please analyze this equipment and provide the following information. If you cannot determine a value with reasonable confidence, return null for that field.

Return ONLY a valid JSON object with these fields:
{
  "brand": "The manufacturer name (Carrier, Trane, Lennox, Goodman, Rheem, Mitsubishi, Daikin, York, Amana, Bryant, etc.)",
  "equipment_type": "The type of equipment (Air Conditioner, Heat Pump, Furnace, Air Handler, Evaporator Coil, Window Unit, Branch Box, Package Unit, Mini-Split, Condenser, etc.)",
  "manufactured_year": "The year of manufacture as a number (decode from serial number patterns)",
  "tonnage": "The system capacity (e.g., '2 Ton', '3 Ton', '4 Ton')",
  "refrigerant": "The refrigerant type (R-22, R-410A, R-32, R-454B, etc.)",
  "seer_rating": "The SEER rating as a number if decodable from model number",
  "breaker_size": "Recommended circuit breaker size in amps (e.g., '20', '30', '40')",
  "fan_motor_info": "Fan motor details if available (e.g., 'Variable Speed', 'Single Stage', 'ECM')",
  "compressor_info": "Compressor details if available (e.g., 'Single Stage', 'Two Stage', 'Variable Speed')",
  "factory_charge": "Factory refrigerant charge in ounces or pounds if decodable (e.g., '106 oz', '8 lbs 10 oz')",
  "voltage_info": "Electrical specifications (e.g., '208-230V/1PH/60Hz', '460V/3PH/60Hz')"
}

IMPORTANT: 
- Use standard serial number decoding patterns for each brand
- For Carrier: First 4 digits are week/year (e.g., 2519 = week 25, 2019)
- For Trane: Look for year indicator in specific positions
- For Lennox: First 2 digits often indicate year
- For Goodman/Amana: First 4 digits are year/month
- For Rheem: Look at first 4 characters for week/year
- Factory charge is typically encoded in model numbers or found on data plates
- Voltage info format: Voltage/Phase/Frequency (e.g., 208-230V/1PH/60Hz)
- Return ONLY the JSON object, no additional text`;

    // Call the Lovable AI Gateway for decoding
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'user', content: decodePrompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'decode_equipment',
              description: 'Decode HVAC equipment specifications from model and serial numbers',
              parameters: {
                type: 'object',
                properties: {
                  brand: { type: 'string', description: 'The manufacturer name' },
                  equipment_type: { type: 'string', description: 'Type of HVAC equipment' },
                  manufactured_year: { type: 'number', description: 'Year of manufacture' },
                  tonnage: { type: 'string', description: 'System capacity' },
                  refrigerant: { type: 'string', description: 'Refrigerant type' },
                  seer_rating: { type: 'number', description: 'SEER efficiency rating' },
                  breaker_size: { type: 'string', description: 'Recommended breaker size in amps' },
                  fan_motor_info: { type: 'string', description: 'Fan motor details' },
                  compressor_info: { type: 'string', description: 'Compressor details' },
                  factory_charge: { type: 'string', description: 'Factory refrigerant charge' },
                  voltage_info: { type: 'string', description: 'Electrical specifications (voltage/phase/frequency)' },
                },
                required: ['brand'],
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'decode_equipment' } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        console.error('Rate limit exceeded');
        return new Response(
          JSON.stringify({ error: 'Service is busy. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (status === 402) {
        console.error('Payment required');
        return new Response(
          JSON.stringify({ error: 'Service temporarily unavailable. Please try again later.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to decode equipment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    console.log('AI decode response:', JSON.stringify(aiData, null, 2));

    // Extract the tool call result
    let decodedSpecs: Record<string, unknown> = {};
    
    if (aiData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments) {
      try {
        decodedSpecs = JSON.parse(aiData.choices[0].message.tool_calls[0].function.arguments);
      } catch (e) {
        console.error('Failed to parse tool call arguments:', e);
      }
    } else if (aiData.choices?.[0]?.message?.content) {
      // Fallback: try to parse from content if no tool call
      try {
        const content = aiData.choices[0].message.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          decodedSpecs = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error('Failed to parse content as JSON:', e);
      }
    }

    // Merge image analysis results if available
    if (imageAnalysisResult) {
      // Prefer image-extracted values for certain fields if decoded specs don't have them
      if (!decodedSpecs.refrigerant && imageAnalysisResult.refrigerant) {
        decodedSpecs.refrigerant = imageAnalysisResult.refrigerant;
      }
      if (!decodedSpecs.tonnage && imageAnalysisResult.tonnage) {
        decodedSpecs.tonnage = imageAnalysisResult.tonnage;
      }
      if (!decodedSpecs.brand && imageAnalysisResult.brand) {
        decodedSpecs.brand = imageAnalysisResult.brand;
      }
    }

    // Build PUBLIC specs for equipment_pages (NO private/scan-specific data)
    // NOTE: serial_number and manufactured_year are excluded - they belong in equipment_scans only
    // manufactured_year varies per unit of the same model, so it's not appropriate for model-level pages
    const publicSpecs = {
      brand: decodedSpecs.brand || null,
      model_number: extractedModelNumber,
      tonnage: decodedSpecs.tonnage || null,
      refrigerant: decodedSpecs.refrigerant || null,
      breaker_size: decodedSpecs.breaker_size || null,
      seer_rating: decodedSpecs.seer_rating || null,
      equipment_type: decodedSpecs.equipment_type || null,
      fan_motor_info: decodedSpecs.fan_motor_info || null,
      compressor_info: decodedSpecs.compressor_info || null,
      factory_charge: decodedSpecs.factory_charge || null,
      voltage_info: decodedSpecs.voltage_info || null,
    };

    // Build PRIVATE specs for equipment_scans (includes all data including scan-specific info)
    const privateSpecs = {
      ...publicSpecs,
      serial_number: extractedSerialNumber || null,
      manufactured_year: decodedSpecs.manufactured_year || null,
    };

    console.log('Public specs (for equipment_pages):', publicSpecs);
    console.log('Private specs (for equipment_scans):', privateSpecs);

    // Save to database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Truncate string values to fit DB column limits (AI may return verbose strings)
    const trunc = (v: unknown, max: number): string | null => {
      if (v === null || v === undefined) return null;
      const s = String(v);
      return s.length > max ? s.slice(0, max) : s;
    };

    // Save to equipment_scans with PRIVATE specs (includes serial number)
    const { data: scanData, error: scanError } = await supabase
      .from('equipment_scans')
      .insert({
        zip_code: trunc(zipCode, 10),
        email: trunc(email, 255),
        brand: trunc(privateSpecs.brand, 100),
        model_number: trunc(privateSpecs.model_number, 100),
        serial_number: trunc(privateSpecs.serial_number, 100),
        manufactured_year: privateSpecs.manufactured_year,
        tonnage: trunc(privateSpecs.tonnage, 20),
        refrigerant: trunc(privateSpecs.refrigerant, 50),
        breaker_size: trunc(privateSpecs.breaker_size, 20),
        seer_rating: privateSpecs.seer_rating,
        equipment_type: trunc(privateSpecs.equipment_type, 50),
        fan_motor_info: privateSpecs.fan_motor_info,
        compressor_info: privateSpecs.compressor_info,
        raw_ai_response: { decode: aiData, vision: imageAnalysisResult },
        is_dfw: isDfw || false,
      })
      .select('id')
      .single();

    if (scanError) {
      console.error('Failed to save scan:', scanError);
      // Continue anyway - don't fail the user request
    }

    // Route equipment_pages create/update through the shared upsert function.
    // Single source of truth — handles dedupe, slug normalization, conflict logging.
    if (publicSpecs.brand && typeof publicSpecs.brand === 'string' && publicSpecs.model_number) {
      try {
        const { error: upsertErr } = await supabase.functions.invoke('upsert-equipment-page', {
          body: {
            brand: publicSpecs.brand,
            model_number: publicSpecs.model_number,
            source: 'scanner',
            source_confidence: 0.9,
            equipment_type: publicSpecs.equipment_type ?? undefined,
            tonnage: publicSpecs.tonnage ?? undefined,
            seer_rating: publicSpecs.seer_rating ?? undefined,
            refrigerant: publicSpecs.refrigerant ?? undefined,
            manufactured_year: decodedSpecs.manufactured_year ?? undefined,
            voltage_info: publicSpecs.voltage_info ?? undefined,
            breaker_size: publicSpecs.breaker_size ?? undefined,
            fan_motor_info: publicSpecs.fan_motor_info ?? undefined,
            compressor_info: publicSpecs.compressor_info ?? undefined,
            factory_charge: publicSpecs.factory_charge ?? undefined,
            install_zip: zipCode ?? undefined,
            increment_times_searched: true,
          },
        });
        if (upsertErr) {
          console.error('upsert-equipment-page invoke error:', upsertErr);
        }
      } catch (err) {
        console.error('upsert-equipment-page failed (non-fatal):', err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        scanId: scanData?.id,
        specs: privateSpecs, // Return full specs to the user who scanned
        raw_ai_response: { decode: aiData, vision: imageAnalysisResult },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error decoding equipment:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to decode equipment' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
