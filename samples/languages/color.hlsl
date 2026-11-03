struct PixelInput {
    float4 position : SV_POSITION;
    float2 coordinate : TEXCOORD0;
};

struct PixelOutput {
    float4 color : SV_TARGET;
};

cbuffer ColorSettings : register(b0) {
    float4 baseColor;
    float pulse;
    float opacity;
    float2 padding;
};

float ring_mask(float2 coordinate, float radius) {
    float2 centered = coordinate - float2(0.5, 0.5);
    float distanceFromCenter = length(centered);
    return 1.0 - smoothstep(radius - 0.02, radius + 0.02, distanceFromCenter);
}

PixelOutput main(PixelInput input) {
    PixelOutput output;
    float2 coordinate = saturate(input.coordinate);
    float radius = 0.15 + 0.05 * abs(sin(pulse));
    float mask = ring_mask(coordinate, radius);
    float3 shaded = saturate(baseColor.rgb * mask);
    float3 accent = lerp(shaded, float3(0.1, 0.4, 0.8), 0.15);
    float vignette = 1.0 - smoothstep(0.2, 0.8, length(coordinate - 0.5));
    shaded = saturate(accent * vignette);
    float alpha = saturate(opacity);
    output.color = float4(shaded, alpha);
    return output;
}
