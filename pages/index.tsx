import {
  Box,
  Button,
  Flex,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Radio,
  RadioGroup,
  SimpleGrid,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Stack,
  Textarea,
} from "@chakra-ui/react";
import { Canvas } from "@react-three/fiber";
import fonts from "google-fonts-complete";
import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import * as opentype from "opentype.js";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { HexColorInput, HexColorPicker } from "react-colorful";
import { ThreeJS, ThreeJSProps } from "../components/ThreeJS";
import styles from "../styles/Home.module.css";
import { ModelType } from "../types";
import { useLocalStorage } from "../utils";

type FontVariant = {
  local: string[];
  url: {
    eot: string;
    svg: string;
    ttf: string;
    woff: string;
    woff2: string;
  };
};

type Font = {
  category: string;
  lastModified: string;
  subsets: string[];
  unicodeRange: Record<string, string>;
  variants: Record<string, Record<string, FontVariant>>;
};

type GetFontInfoParamsType = {
  url?: string;
  fontName?: string;
  fontVariant?: "normal" | "italic";
  fontWeight?: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
};

type GetFontInfoVariantsKeyType = "normal" | "italic";

type GetFontInfoReturnType = {
  fontName: string;
  url: string;
  category: "sans-serif" | "serif" | "display" | "script" | "monospaced";
  variants: {
    [P in GetFontInfoVariantsKeyType]?: (100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900)[];
  };
};

const fontsList = fonts as Record<string, Font>;

const fontCache: { [url: string]: opentype.Font } = {};

const DEFAULT_TEXT_SETTINGS: ThreeJSProps["textSettings"] = {
  text: "Hellow world!",
  type: ModelType.TextOnly,
  bevelSize: 8,
  bevelThickness: 1,
  bevelSegments: 3,
  curveSegments: 12,
  height: 10,
  color: "#aabbcc",
};

const DEFAULT_SUPPORT_SETTINGS: ThreeJSProps["supportSettings"] = {
  top: 10,
  bottom: 10,
  left: 10,
  right: 10,
  depth: 10,
  radius: 5,
  spacing: 2,
  vSpacing: 0,
  align: "left",
  color: "#aabbcc",
};

const Home: NextPage = () => {
  const [isLoading, setIsLoading] = useState(false);

  const [_, setSavedSettings, { getLocalStorageValue }] = useLocalStorage({
    key: "saved-settings",
    initialValue: { textSettings: DEFAULT_TEXT_SETTINGS, supportSettings: DEFAULT_SUPPORT_SETTINGS },
  });

  const [textSettings, setTextSettings] = useState(DEFAULT_TEXT_SETTINGS);
  const [supportSettings, setSupportSettings] = useState(DEFAULT_SUPPORT_SETTINGS);

  const getFontInfo = ({ url, fontVariant = "normal", fontWeight = 400, ...params }: GetFontInfoParamsType): GetFontInfoReturnType => {
    let fontName: string;
    if (params.fontName) fontName = params.fontName;
    else {
      const parsedFontName = url?.toLowerCase().replaceAll(" ", "").replaceAll("https://fonts.gstatic.com/s/", "").split("/")[0];
      const item = Object.entries(fontsList).find(([fontName, item]) => {
        const formattedFontName = fontName.toLowerCase().replaceAll(" ", "");
        if (formattedFontName === parsedFontName) return true;
      });
      fontName = item?.[0] || "";
    }

    const { category, variants: obj } = fontsList[fontName];
    const variant = fontVariant ? obj[fontVariant] ?? obj[Object.keys(obj)[0]] : obj[Object.keys(obj)[0]];

    let newFontUrl: string;
    if (url) newFontUrl = url;
    else {
      const face = fontWeight ? variant[fontWeight] ?? variant[Object.keys(variant)[0]] : variant[Object.keys(variant)[0]];
      newFontUrl = face.url.ttf;
    }

    const variants: GetFontInfoReturnType["variants"] = {};
    Object.entries(obj).forEach(([key, val]) => {
      variants[key as keyof GetFontInfoReturnType["variants"]] = Object.keys(val).map(val => +val) as any;
    });

    return {
      url: newFontUrl,
      fontName,
      variants,
      category: category as GetFontInfoReturnType["category"],
    };
  };

  const fetchNewFont = useCallback(
    async (newFontUrl: string) => {
      setIsLoading(true);

      if (!fontCache[newFontUrl]) {
        const res = await fetch(newFontUrl);
        const fontData = await res.arrayBuffer();
        const font = opentype.parse(fontData);
        fontCache[newFontUrl] = font;
      }

      setIsLoading(false);
    },
    // eslint-disable-next-line
    [Object.keys(fontCache).length]
  );

  const changeFont = async ({ fontName }: { fontName: string }) => {
    const { url: newFontUrl } = getFontInfo({ fontName });
    setTextSettings(prev => ({ ...prev, fontUrl: newFontUrl }));
    await fetchNewFont(newFontUrl);
  };

  const changeFontVariant = async (params: Pick<Required<GetFontInfoParamsType>, "fontName" | "fontVariant" | "fontWeight">) => {
    const { url: newFontUrl } = getFontInfo(params);
    setTextSettings(prev => ({ ...prev, fontUrl: newFontUrl }));
    await fetchNewFont(newFontUrl);
  };

  useEffect(() => {
    setSavedSettings({
      textSettings,
      supportSettings: {
        ...supportSettings,
        ...(textSettings.type === ModelType.TextOnly && getLocalStorageValue()?.supportSettings),
      },
    });
    // eslint-disable-next-line
  }, [
    textSettings.type,
    textSettings.text,
    textSettings.fontUrl,
    textSettings.color,
    textSettings.height,
    textSettings.curveSegments,
    textSettings.bevelSegments,
    textSettings.bevelSize,
    textSettings.bevelThickness,
    supportSettings.top,
    supportSettings.bottom,
    supportSettings.left,
    supportSettings.right,
    supportSettings.depth,
    supportSettings.radius,
    supportSettings.align,
    supportSettings.spacing,
    supportSettings.vSpacing,
    supportSettings.color,
    setSavedSettings,
  ]);

  useEffect(() => {
    const savedSettings = getLocalStorageValue();
    console.log(textSettings.type, savedSettings?.textSettings.type);
    if (textSettings.type !== ModelType.TextOnly) {
      if (savedSettings) setSupportSettings(savedSettings.supportSettings);
    } else {
      setTextSettings(prev => ({ ...prev, ...savedSettings?.textSettings }));
      setSupportSettings(prev => ({ ...prev, top: 0, bottom: 0, left: 0, right: 0, depth: 0 }));
    }
    // eslint-disable-next-line
  }, [textSettings.type]);

  useEffect(() => {
    let { fontUrl } = textSettings;
    if (!fontUrl) {
      fontUrl = getLocalStorageValue()?.textSettings?.fontUrl || getFontInfo({ fontName: "Roboto" }).url;
      setTextSettings(prev => ({ ...prev, fontUrl }));
    }

    fetchNewFont(fontUrl!);
    // eslint-disable-next-line
  }, [textSettings.fontUrl, fetchNewFont]);

  // eslint-disable-next-line
  const slicedFontsList = useMemo(() => ["Roboto"].concat(Object.keys(fontsList).slice().slice(0, 50)), [fontsList.length]);
  const fontDetails = useMemo(() => {
    return textSettings.fontUrl ? getFontInfo({ url: textSettings.fontUrl }) : undefined;
  }, [textSettings.fontUrl]);
  const arr = useMemo(() => {
    return Object.entries(fontDetails?.variants || {}).map(([fontVariant, weights]) =>
      weights.map(fontWeight => ({
        fontWeight,
        fontVariant: fontVariant as keyof GetFontInfoReturnType["variants"],
        formatted: fontVariant + " " + fontWeight,
      }))
    );
    // eslint-disable-next-line
  }, [fontDetails?.url, Object.keys(fontDetails?.variants || {}).length]);

  return (
    <div className={styles.container}>
      <Head>
        <title>Create Next App</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {/* <div style={{ fontSize: 150, WebkitTextFillColor: "white", WebkitTextStroke: "red 3px" }}>Hello world</div> */}
      <SimpleGrid columns={4} flexDir="row" gap={4}>
        {Object.keys(supportSettings)
          .slice()
          .slice(0, 8)
          .map(item => {
            const val = +(supportSettings[item as keyof typeof supportSettings] || 0);
            return (
              <div key={item}>
                {item}:
                <NumberInput
                  min={-50}
                  max={100}
                  defaultValue={0}
                  value={isNaN(val) ? 0 : val}
                  onChange={(_, newValAsNumber) => {
                    setSupportSettings(prev => ({ ...prev, [item]: isNaN(newValAsNumber) ? 0 : newValAsNumber }));
                  }}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </div>
            );
          })}
        <RadioGroup
          value={supportSettings.align}
          onChange={val => setSupportSettings(prev => ({ ...prev, align: val as typeof supportSettings["align"] }))}
        >
          <Stack justifyContent="space-between" direction="row">
            {["Left", "Center", "Right"].map(val => (
              <Radio key={val} value={val.toLowerCase()}>
                {val}
              </Radio>
            ))}
          </Stack>
        </RadioGroup>
        <RadioGroup value={textSettings.type} onChange={val => setTextSettings(prev => ({ ...prev, type: +val }))}>
          <Stack direction="row">
            {Object.keys(ModelType)
              .filter(v => isNaN(Number(v)))
              .map(val => (
                <Radio key={val} value={ModelType[val as keyof typeof ModelType]}>
                  {val}
                </Radio>
              ))}
          </Stack>
        </RadioGroup>
      </SimpleGrid>
      <Box mt={10} h={500} bg="gray.300">
        <Canvas>
          <ThreeJS textSettings={textSettings} supportSettings={supportSettings} font={fontCache[textSettings.fontUrl || ""]} />
        </Canvas>
      </Box>
      <SimpleGrid columns={2} gap={4} mt={8}>
        <Flex justifyContent="space-between">
          <div>
            {/* eslint-disable-next-line */}
            {[<HexColorPicker />, <HexColorInput />].map((element, key) => {
              return React.cloneElement(element, {
                key,
                color: textSettings.color,
                onChange: (newClr: string) => setTextSettings(prev => ({ ...prev, color: newClr })),
              });
            })}
          </div>
          <div>
            {/* eslint-disable-next-line */}
            {[<HexColorPicker />, <HexColorInput />].map((element, key) => {
              return React.cloneElement(element, {
                key,
                color: supportSettings.color,
                onChange: (newClr: string) => setSupportSettings(prev => ({ ...prev, color: newClr })),
              });
            })}
          </div>
        </Flex>
        <Flex flexDir="column" gap={4}>
          <Menu>
            {/* @ts-ignore */}
            <MenuButton as={Button}>Font {isLoading ? "Loading..." : ""}</MenuButton>
            <MenuList maxHeight={320} overflowY="scroll">
              {slicedFontsList.map(fontName => (
                <MenuItem key={fontName} onClick={async () => await changeFont({ fontName })}>
                  {fontName}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
          <Menu>
            {/* @ts-ignore */}
            <MenuButton as={Button} disabled={!!!fontDetails}>
              Font variant {isLoading ? "Loading..." : ""}
            </MenuButton>
            <MenuList maxHeight={320} overflowY="scroll">
              {fontDetails &&
                arr.flat().map(({ formatted, ...rest }, i) => (
                  <MenuItem key={i} onClick={async () => await changeFontVariant({ ...rest, fontName: fontDetails?.fontName })}>
                    {formatted}
                  </MenuItem>
                ))}
            </MenuList>
          </Menu>
        </Flex>
        <Textarea
          placeholder="Enter your text..."
          value={textSettings.text}
          onChange={e => setTextSettings(prev => ({ ...prev, text: e.target.value }))}
        />
        <div>
          Bevel size:
          <Slider
            aria-label="bevel-size"
            min={1}
            max={100}
            value={textSettings.bevelSize}
            onChange={newVal => setTextSettings(prev => ({ ...prev, bevelSize: newVal }))}
          >
            <SliderTrack>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb />
          </Slider>
        </div>
        <div>
          Bevel thickness:
          <Slider
            aria-label="bevel-thickness"
            value={textSettings.bevelThickness}
            onChange={newVal => setTextSettings(prev => ({ ...prev, bevelThickness: newVal }))}
          >
            <SliderTrack>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb />
          </Slider>
        </div>
        <div>
          Curve segments:
          <Slider
            aria-label="curve-segments"
            min={1}
            max={12}
            step={2}
            value={textSettings.curveSegments}
            onChange={newVal => setTextSettings(prev => ({ ...prev, curveSegments: newVal }))}
          >
            <SliderTrack>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb />
          </Slider>
        </div>
        <div>
          Height: {textSettings.height}
          <Slider
            aria-label="height"
            min={1}
            max={50}
            step={1}
            value={textSettings.height}
            onChange={newVal => setTextSettings(prev => ({ ...prev, height: newVal }))}
          >
            <SliderTrack>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb />
          </Slider>
        </div>
      </SimpleGrid>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Welcome to <a href="https://nextjs.org">Next.js!</a>
        </h1>

        <p className={styles.description}>
          Get started by editing <code className={styles.code}>pages/index.tsx</code>
        </p>

        <div className={styles.grid}>
          <a href="https://nextjs.org/docs" className={styles.card}>
            <h2>Documentation &rarr;</h2>
            <p>Find in-depth information about Next.js features and API.</p>
          </a>

          <a href="https://nextjs.org/learn" className={styles.card}>
            <h2>Learn &rarr;</h2>
            <p>Learn about Next.js in an interactive course with quizzes!</p>
          </a>

          <a href="https://github.com/vercel/next.js/tree/canary/examples" className={styles.card}>
            <h2>Examples &rarr;</h2>
            <p>Discover and deploy boilerplate example Next.js projects.</p>
          </a>

          <a
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
            className={styles.card}
          >
            <h2>Deploy &rarr;</h2>
            <p>Instantly deploy your Next.js site to a public URL with Vercel.</p>
          </a>
        </div>
      </main>

      <footer className={styles.footer}>
        <a
          href="https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          Powered by{" "}
          <span className={styles.logo}>
            <Image src="/vercel.svg" alt="Vercel Logo" width={72} height={16} />
          </span>
        </a>
      </footer>
    </div>
  );
};

export default Home;
