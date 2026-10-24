// src/components/SunMascot.js
// The sun of the ASP, alive, for the login screen:
//   - the eyes FOLLOW what is being typed (they start on the left and go to the right as the text grows);
//   - on the password field the sun COVERS its eyes with its hands;
//   - it blinks and breathes by itself;
//   - mood "happy": it jumps with a big smile (the login worked); mood "sad": it shakes its head (it did not).
// It is drawn in code (SVG), with the colors of the brand, so it works in Expo Go and in the real app.
import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet } from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

const DARK = "#1F1B4D";
const RAYS = Array.from({ length: 12 }, (_, i) => ({
  angle: i * 30,
  long: i % 2 === 0,
}));

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const SunMascot = ({
  size = 160,
  focus = null, // null | "email" | "code" | "password"
  textLength = 0, // how many characters are typed in the field that has the focus
  mood = "idle", // "idle" | "happy" | "sad"
}) => {
  const unit = size / 512; // 1 unit of the drawing, in pixels

  const gazeX = useRef(new Animated.Value(0)).current;
  const gazeY = useRef(new Animated.Value(0)).current;
  const blink = useRef(new Animated.Value(1)).current;
  const handsY = useRef(new Animated.Value(size * 0.55)).current;
  const handsOpacity = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const jump = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(1)).current;

  const covering = focus === "password";

  // Breathing: a very small movement, all the time
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1.03,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breathe]);

  // Blinking, now and then (not while the hands are on the eyes)
  useEffect(() => {
    if (covering) return undefined;
    let timer;
    const schedule = () => {
      timer = setTimeout(() => {
        Animated.sequence([
          Animated.timing(blink, { toValue: 0.1, duration: 90, useNativeDriver: true }),
          Animated.timing(blink, { toValue: 1, duration: 120, useNativeDriver: true }),
        ]).start(schedule);
      }, 2600 + Math.random() * 2400);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [blink, covering]);

  // The eyes follow the text: empty = left, long = right. They look a little down, to the field.
  useEffect(() => {
    const typing = focus === "email" || focus === "code";
    const full = focus === "code" ? 8 : 26; // the length at which they reach the right side
    const progress = typing ? clamp(textLength / full, 0, 1) : 0.5;
    const x = typing ? (progress * 2 - 1) * 7 * unit : 0;
    const y = typing ? 5 * unit : 0;

    Animated.parallel([
      Animated.timing(gazeX, { toValue: x, duration: 140, useNativeDriver: true }),
      Animated.timing(gazeY, { toValue: y, duration: 140, useNativeDriver: true }),
    ]).start();
  }, [focus, textLength, unit, gazeX, gazeY]);

  // The hands go up to cover the eyes on the password, and go down again
  useEffect(() => {
    Animated.parallel([
      Animated.spring(handsY, {
        toValue: covering ? 0 : size * 0.55,
        friction: 7,
        tension: 70,
        useNativeDriver: true,
      }),
      Animated.timing(handsOpacity, {
        toValue: covering ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [covering, size, handsY, handsOpacity]);

  // Happy: a jump. Sad: it shakes its head.
  useEffect(() => {
    if (mood === "happy") {
      Animated.sequence([
        Animated.timing(jump, { toValue: -size * 0.09, duration: 150, useNativeDriver: true }),
        Animated.spring(jump, { toValue: 0, friction: 4, useNativeDriver: true }),
      ]).start();
    } else if (mood === "sad") {
      const step = (toValue) =>
        Animated.timing(shake, { toValue, duration: 70, useNativeDriver: true });
      Animated.sequence([
        step(-size * 0.05),
        step(size * 0.05),
        step(-size * 0.04),
        step(size * 0.04),
        step(0),
      ]).start();
    }
  }, [mood, size, jump, shake]);

  const faceX = Animated.multiply(gazeX, 0.35);
  const faceY = Animated.multiply(gazeY, 0.35);

  // The eyes by mood
  const eyes =
    mood === "happy" ? (
      <>
        <Path d="M 203 260 Q 220.6 236 238 260" fill="none" stroke={DARK} strokeWidth="9" strokeLinecap="round" />
        <Path d="M 273 260 Q 291.4 236 309 260" fill="none" stroke={DARK} strokeWidth="9" strokeLinecap="round" />
      </>
    ) : (
      <>
        <Circle cx="220.6" cy="252.6" r="10" fill={DARK} />
        <Circle cx="291.4" cy="252.6" r="10" fill={DARK} />
        <Circle cx="224.1" cy="249" r="3.2" fill="#FFFFFF" />
        <Circle cx="294.9" cy="249" r="3.2" fill="#FFFFFF" />
      </>
    );

  // The mouth by mood
  const mouth =
    mood === "happy" ? (
      <>
        <Path d="M 212 284 Q 256 350 300 284 Z" fill={DARK} />
        <Ellipse cx="256" cy="318" rx="20" ry="10" fill="#FF6B6B" />
      </>
    ) : mood === "sad" ? (
      <Path d="M 222 320 Q 256 292 290 320" fill="none" stroke={DARK} strokeWidth="8.8" strokeLinecap="round" />
    ) : (
      <Path d="M 220.6 288 Q 256 328.1 291.4 288" fill="none" stroke={DARK} strokeWidth="8.8" strokeLinecap="round" />
    );

  const layer = [StyleSheet.absoluteFill];

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        transform: [{ translateX: shake }, { translateY: jump }, { scale: breathe }],
      }}
    >
      {/* The body: the rays and the face of the sun */}
      <Svg width={size} height={size} viewBox="0 0 512 512" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="sunG" cx="0.4" cy="0.35" r="0.8">
            <Stop offset="0" stopColor="#FFE066" />
            <Stop offset="0.65" stopColor="#FFC933" />
            <Stop offset="1" stopColor="#FFA62B" />
          </RadialGradient>
        </Defs>
        {RAYS.map((ray) => (
          <Rect
            key={ray.angle}
            x="235.9"
            y={ray.long ? 55.5 : 81.5}
            width="40.1"
            height={ray.long ? 73.2 : 47.2}
            rx="20.1"
            fill={ray.long ? "#FFE066" : "#FFB44D"}
            transform={`rotate(${ray.angle} 256 262)`}
          />
        ))}
        <Circle cx="256" cy="262" r="118" fill="url(#sunG)" />
        <Circle cx="256" cy="262" r="108.6" fill="none" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="4.1" />
      </Svg>

      {/* The mouth and the cheeks move a little with the look */}
      <Animated.View style={[layer, { transform: [{ translateX: faceX }, { translateY: faceY }] }]}>
        <Svg width={size} height={size} viewBox="0 0 512 512">
          {mouth}
          <Circle cx="192.3" cy="285.6" r="13" fill="#FF6B6B" opacity="0.85" />
          <Circle cx="319.7" cy="285.6" r="13" fill="#FF6B6B" opacity="0.85" />
        </Svg>
      </Animated.View>

      {/* The eyes: they follow the text, and blink */}
      <Animated.View
        style={[layer, { transform: [{ translateX: gazeX }, { translateY: gazeY }, { scaleY: blink }] }]}
      >
        <Svg width={size} height={size} viewBox="0 0 512 512">
          {eyes}
        </Svg>
      </Animated.View>

      {/* The hands over the eyes (password) */}
      <Animated.View
        pointerEvents="none"
        style={[layer, { opacity: handsOpacity, transform: [{ translateY: handsY }] }]}
      >
        <Svg width={size} height={size} viewBox="0 0 512 512">
          <G>
            <Ellipse cx="214" cy="258" rx="50" ry="36" fill="#FFC933" stroke="#E59A12" strokeWidth="6" />
            <Path d="M 186 244 Q 214 226 242 244" fill="none" stroke="#FFE066" strokeWidth="6" strokeLinecap="round" />
            <Path d="M 196 232 L 196 242 M 214 228 L 214 238 M 232 232 L 232 242" stroke="#E59A12" strokeWidth="5" strokeLinecap="round" />
          </G>
          <G>
            <Ellipse cx="298" cy="258" rx="50" ry="36" fill="#FFC933" stroke="#E59A12" strokeWidth="6" />
            <Path d="M 270 244 Q 298 226 326 244" fill="none" stroke="#FFE066" strokeWidth="6" strokeLinecap="round" />
            <Path d="M 280 232 L 280 242 M 298 228 L 298 238 M 316 232 L 316 242" stroke="#E59A12" strokeWidth="5" strokeLinecap="round" />
          </G>
        </Svg>
      </Animated.View>
    </Animated.View>
  );
};

export default SunMascot;
