import { expect, test } from "@playwright/test";

interface ProjectionPoint {
  xn: number;
  zn: number;
  yn: number;
  nx: number;
  nz: number;
}

interface RegionSample {
  expected: string;
  name: string;
  point: ProjectionPoint;
}

const MAP_RANGE = 1.15;
const MAP_SIZE = { height: 1024, width: 660 };

test.skip(
  process.env.MUSCLE_SPIKE_E2E !== "true",
  "The anatomy authoring route exists only under the Next.js development server."
);

test("serves and projects the checkpoint-two anatomy masks", async ({ page }) => {
  const mapResponses: Record<string, number[]> = {
    back: [],
    front: [],
    side: []
  };

  page.on("response", (response) => {
    const match = response.url().match(/muscle-regions-(front|back|side)\.svg/);

    if (match?.[1]) {
      mapResponses[match[1]]?.push(response.status());
    }
  });

  await page.goto("/muscle-spike");
  await expect(page.getByRole("heading", { name: "MUSCLE_MASK_VALIDATION" })).toBeVisible();
  await page.waitForFunction(
    () =>
      typeof (window as unknown as Record<string, unknown>).__muscleSpikeReloadMaps ===
        "function" &&
      typeof (window as unknown as Record<string, unknown>).__muscleSpikeRegionAt === "function"
  );

  await page.evaluate(async () => {
    const spikeWindow = window as unknown as {
      __muscleSpikeReloadMaps: () => Promise<void>;
    };

    await spikeWindow.__muscleSpikeReloadMaps();
  });

  for (const side of ["front", "back", "side"]) {
    expect(mapResponses[side], `${side} map should load and reload successfully`).toEqual(
      expect.arrayContaining([200, 200])
    );
  }

  const samples: RegionSample[] = [
    { name: "front right forearm", expected: "forearms", point: frontPoint(110, 120) },
    { name: "front left forearm mirror", expected: "forearms", point: frontPoint(550, 120) },
    { name: "back forearm", expected: "forearms", point: backPoint(110, 120) },
    { name: "right side forearm", expected: "forearms", point: sidePoint(360, 125) },
    {
      name: "left side forearm mirror",
      expected: "forearms",
      point: mirrorSidePoint(sidePoint(360, 125))
    },
    { name: "front anterior deltoid", expected: "shoulders", point: frontPoint(195, 160) },
    { name: "back posterior deltoid", expected: "shoulders", point: backPoint(195, 170) },
    {
      name: "right lateral deltoid",
      expected: "shoulders",
      point: { ...sidePoint(280, 170), zn: 0.65 }
    },
    {
      name: "left lateral deltoid mirror",
      expected: "shoulders",
      point: mirrorSidePoint({ ...sidePoint(280, 170), zn: 0.65 })
    },
    { name: "front rounded biceps belly", expected: "biceps", point: frontPoint(150, 180) },
    { name: "rear biceps edge", expected: "biceps", point: backPoint(150, 155) },
    { name: "front triceps underside", expected: "triceps", point: frontPoint(150, 230) },
    { name: "rear triceps mass", expected: "triceps", point: backPoint(150, 215) },
    { name: "front unified quadriceps", expected: "quads", point: frontPoint(250, 550) },
    { name: "right lateral quadriceps", expected: "quads", point: sidePoint(335, 560) },
    { name: "front posteromedial calf", expected: "calves", point: frontPoint(295, 780) },
    { name: "rear calf mass", expected: "calves", point: backPoint(260, 780) },
    { name: "right posteromedial calf", expected: "calves", point: sidePoint(292, 800) },
    { name: "front fist", expected: "none", point: frontPoint(120, 45) },
    { name: "back fist", expected: "none", point: backPoint(120, 45) },
    { name: "side fist eraser", expected: "none", point: sidePoint(370, 50) },
    { name: "side elbow eraser", expected: "none", point: sidePoint(350, 202) },
    { name: "front elbow gap", expected: "none", point: frontPoint(78, 195) },
    { name: "back elbow gap", expected: "none", point: backPoint(78, 195) },
    {
      name: "central head is protected from side forearm",
      expected: "none",
      point: { ...sidePoint(360, 125), zn: 0.2 }
    },
    { name: "front knee gap", expected: "none", point: frontPoint(250, 680) },
    { name: "back knee gap", expected: "none", point: backPoint(270, 680) },
    { name: "side knee eraser", expected: "none", point: sidePoint(330, 705) },
    { name: "front shin", expected: "none", point: frontPoint(280, 780) },
    { name: "side shin eraser", expected: "none", point: sidePoint(340, 800) },
    { name: "front ankle", expected: "none", point: frontPoint(270, 910) },
    { name: "side ankle eraser", expected: "none", point: sidePoint(300, 915) },
    { name: "front foot", expected: "none", point: frontPoint(270, 970) },
    { name: "side foot eraser", expected: "none", point: sidePoint(330, 975) },
    {
      name: "forearm does not steal front biceps",
      expected: "biceps",
      point: frontPoint(170, 185)
    },
    {
      name: "forearm does not steal back triceps",
      expected: "triceps",
      point: backPoint(160, 225)
    },
    {
      name: "deltoid does not steal chest",
      expected: "chest",
      point: frontPoint(280, 250)
    },
    {
      name: "deltoid does not steal traps",
      expected: "traps",
      point: frontPoint(270, 160)
    },
    {
      name: "deltoid reclaims the superior lateral cap",
      expected: "shoulders",
      point: frontPoint(245, 150)
    },
    {
      name: "side deltoid does not project onto the outer forearm",
      expected: "none",
      point: sidePoint(280, 170)
    },
    { name: "abs path regression", expected: "abs", point: frontPoint(320, 360) },
    { name: "glute path regression", expected: "glutes", point: backPoint(290, 490) },
    {
      name: "hamstring path regression",
      expected: "hamstrings",
      point: backPoint(275, 610)
    },
    {
      name: "front-dominant diagonal keeps front projection",
      expected: "none",
      point: { ...sidePoint(360, 125), nx: 0.8, nz: 0.6 }
    },
    {
      name: "side-dominant diagonal selects side projection",
      expected: "forearms",
      point: { ...sidePoint(360, 125), nx: 0.6, nz: 0.8 }
    },
    {
      name: "equal diagonal keeps front projection",
      expected: "none",
      point: { ...sidePoint(360, 125), nx: 0.7, nz: 0.7 }
    },
    {
      name: "transparent side pixel falls back to chest",
      expected: "chest",
      point: { ...frontPoint(280, 250), xn: 0, nx: 0.1, nz: 0.9 }
    }
  ];

  const results = await page.evaluate((points) => {
    const spikeWindow = window as unknown as {
      __muscleSpikeRegionAt: (point: ProjectionPoint) => string;
    };

    return points.map(({ point }) => spikeWindow.__muscleSpikeRegionAt(point));
  }, samples);

  const mismatches = samples.flatMap((sample, index) => {
    const received = results[index];

    return received === sample.expected
      ? []
      : [`${sample.name}: expected ${sample.expected}, received ${received ?? "undefined"}`];
  });

  expect(mismatches).toEqual([]);
});

function frontPoint(x: number, y: number): ProjectionPoint {
  return {
    xn: 0,
    zn: MAP_RANGE * (1 - (2 * x) / MAP_SIZE.width),
    yn: 1 - y / MAP_SIZE.height,
    nx: 1,
    nz: 0
  };
}

function backPoint(x: number, y: number): ProjectionPoint {
  return {
    xn: 0,
    zn: MAP_RANGE * ((2 * x) / MAP_SIZE.width - 1),
    yn: 1 - y / MAP_SIZE.height,
    nx: -1,
    nz: 0
  };
}

function sidePoint(x: number, y: number): ProjectionPoint {
  return {
    xn: MAP_RANGE * ((2 * x) / MAP_SIZE.width - 1),
    zn: 0.92,
    yn: 1 - y / MAP_SIZE.height,
    nx: 0,
    nz: 1
  };
}

function mirrorSidePoint(point: ProjectionPoint): ProjectionPoint {
  return { ...point, xn: -point.xn, zn: -point.zn, nz: -point.nz };
}
