export type DemoGallery = {
  title: string
  logo?: string
  images: { src: string; caption: string }[]
}

export const DEMO_GALLERIES: Record<string, DemoGallery> = {
  Rotary2025: {
    title: '2025 Rotary Club Tournament Demos',
    logo: '/demo-bags/Rotary2025/images/NCOLOGO.png',
    images: [
      {src: "/demo-bags/Rotary2025/images/Americans-R.png", caption: "Americans Tournament Bag Red"},
	    {src: "/demo-bags/Rotary2025/images/Americans-B.png", caption: "Americans Tournament Bag Blue"},
	    {src: "/demo-bags/Rotary2025/images/ASPISPS-R.png", caption: "ASPISPS Tournament Bag Red"},
	    {src: "/demo-bags/Rotary2025/images/ASPISPS-B.png", caption: "ASPISPS Tournament Bag Blue"},
	    {src: "/demo-bags/Rotary2025/images/COW-R.png", caption: "Cow Tournament Bag Red"},
	    {src: "/demo-bags/Rotary2025/images/COW-B.png", caption: "Cow Tournament Bag Blue"},
	    {src: "/demo-bags/Rotary2025/images/GoldWater-R.png", caption: "Goldwater Tournament Bag Red"},
	    {src: "/demo-bags/Rotary2025/images/GoldWater-B.png", caption: "Goldwater Tournament Bag Blue"},
    	{src: "/demo-bags/Rotary2025/images/HeltzelHaus-R.png", caption: "HeltzelHaus Tournament Bag Red"},
	    {src: "/demo-bags/Rotary2025/images/HeltzelHaus-B.png", caption: "HeltzelHaus Tournament Bag Blue"},
	    {src: "/demo-bags/Rotary2025/images/K9-R.png", caption: "K9 Tournament Bag Red"},
	    {src: "/demo-bags/Rotary2025/images/K9-B.png", caption: "K9 Tournament Bag Blue"},
	    {src: "/demo-bags/Rotary2025/images/Kline Mem-R.png", caption: "Kline Memorial Tournament Bag Red"},
	    {src: "/demo-bags/Rotary2025/images/Kline Mem-B.png", caption: "Kline Memorial Tournament Bag Blue"},
	    {src: "/demo-bags/Rotary2025/images/Kline Eng-R.png", caption: "Kline Eng Tournament Bag Red"},
	    {src: "/demo-bags/Rotary2025/images/Kline Eng-B.png", caption: "Kline Eng Tournament Bag Blue"},
	    {src: "/demo-bags/Rotary2025/images/Matrix-R.png", caption: "Matrix Tournament Bag Red"},
	    {src: "/demo-bags/Rotary2025/images/Matrix-B.png", caption: "Matrix Tournament Bag Blue"},
	    {src: "/demo-bags/Rotary2025/images/MCPA-R.png", caption: "MCPA Tournament Bag Red"},
	    {src: "/demo-bags/Rotary2025/images/MCPA-B.png", caption: "MCPA Tournament Bag Blue"},
	    {src: "/demo-bags/Rotary2025/images/MOWCOW-R.png", caption: "MowCow Tournament Bag Red"},
	    {src: "/demo-bags/Rotary2025/images/MOWCOW-B.png", caption: "MowCow Tournament Bag Blue"},
	    {src: "/demo-bags/Rotary2025/images/Northside-R.png", caption: "Northside Tournament Bag Red"},
	    {src: "/demo-bags/Rotary2025/images/Northside-B.png", caption: "Northside Tournament Bag Blue"},
    	{src: "/demo-bags/Rotary2025/images/Rotary-R.png", caption: "Rotary Tournament Bag Red"},
	    {src: "/demo-bags/Rotary2025/images/Rotary-B.png", caption: "Rotary Tournament Bag Blue"},
	    {src: "/demo-bags/Rotary2025/images/toyota-R.png", caption: "Toyota Tournament Bag Red"},
	    {src: "/demo-bags/Rotary2025/images/toyota-B.png", caption: "Toyota Tournament Bag Blue"},
	    {src: "/demo-bags/Rotary2025/images/WI-Not-R.png", caption: "WI-Not Tournament Bag Red"},
	    {src: "/demo-bags/Rotary2025/images/WI-Not-B.png", caption: "WI-Not Tournament Bag Blue"},
	    {src: "/demo-bags/Rotary2025/images/WindRiver-R.png", caption: "WindRiver Tournament Bag Red"},
	    {src: "/demo-bags/Rotary2025/images/WindRiver-B.png", caption: "WindRiver Tournament Bag Blue"},
	    {src: "/demo-bags/Rotary2025/images/Windy Knoll-R.png", caption: "Windy Knoll Tournament Bag Red"},
	    {src: "/demo-bags/Rotary2025/images/Windy Knoll-B.png", caption: "Windy Knoll Tournament Bag Blue"},
      // add more...
    ],
  },
  Emerald2025: {
    title: 'Emerald — 21 September 2025',
    logo: '/demo-bags/Emerald2025/images/Logo.png',
    images: [
      { src: '/demo-bags/Emerald2025/images/Logo.png', caption: 'Emerald Logo' },
    ],
  },
  Habitat2025: {
    title: 'Loudon Habitat for Humanity — 27 September 2025',
    logo: '/demo-bags/Habitat2025/images/Logo.png',
    images: [
      { src: '/demo-bags/Habitat2025/images/Logo.png', caption: 'Habitat Logo' },
      {src: '/demo-bags/Habitat2025/images/DryHome-O.png', caption: "DryHome Tournament Bag Orange"},
      {src: '/demo-bags/Habitat2025/images/DryHome.png', caption: "DryHome Tournament Bag"},
      {src: '/demo-bags/Habitat2025/images/MattElliott-O.png', caption: "Matt Elliott Tournament Bag Orange"},
      {src: "/demo-bags/Habitat2025/images/MattElliott.png", caption: "Matt Elliott Tournament Bag"},
      {src: "/demo-bags/Habitat2025/images/United-O.png", caption: "United Tournament Bag Orange"},
      {src: "/demo-bags/Habitat2025/images/United.png", caption: "United Tournament Bag"},
      {src: "/demo-bags/Habitat2025/images/HITT-Y.png", caption: "HITT Tournament Bag Yellow"},
      {src: "/demo-bags/Habitat2025/images/HITT-B.png", caption: "HITT Tournament Bag Blue"},
      {src: "/demo-bags/Habitat2025/images/HTI-Y.png", caption: "HTI Tournament Bag Yellow"},
      {src: "/demo-bags/Habitat2025/images/HTI-B.png", caption: "HTI Tournament Bag Blue"}
    ],
  },
  Raventek2025: {
    title: "Raventek's Cornament",
    logo: '/demo-bags/Raventek2025/images/Logo.png',
    images: [
      { src: '/demo-bags/Raventek2025/images/Logo.png', caption: 'Raventek' },
    ],
  },
  SHMC2025: {
    title: 'SHMC Tournament — 21 September 2025',
    logo: '/demo-bags/SHMC2025/images/logo.jpg',
    images: [
      { src: '/demo-bags/SHMC2025/images/logo.jpg', caption: 'SHMC Logo' },
      { src: '/demo-bags/SHMC2025/images/demo.png',  caption: 'SHMC Tournament Bag Orange' },
      { src: '/demo-bags/SHMC2025/images/demo2.png', caption: 'SHMC Tournament Bag Blue'   },
      
    ],
  },
}