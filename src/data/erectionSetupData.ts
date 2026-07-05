export interface VillageOption {
  name: string;
  contractors: string[];
}

export interface BlockOption {
  name: string;
  villages: VillageOption[];
}

export interface DistrictOption {
  name: string;
  blocks: BlockOption[];
}

export interface StateOption {
  name: string;
  districts: DistrictOption[];
}

export const ERECTION_LOCATION_DATA: StateOption[] = [
  {
    name: 'West Bengal',
    districts: [
      {
        name: 'North 24 Parganas',
        blocks: [
          {
            name: 'Barasat I',
            villages: [
              { name: 'Chhoto Jagulia', contractors: ['Power Grid Corp', 'Bengal Power Works', 'Eastern Line Services'] },
              { name: 'Kadambagachi', contractors: ['L&T Power Transmission', 'North Grid Projects'] },
            ],
          },
          {
            name: 'Habra I',
            villages: [
              { name: 'Kumra', contractors: ['Power Grid Corp', 'Rural Electric Works'] },
              { name: 'Machhalandapur', contractors: ['Bengal Power Works', 'Techno Electric'] },
            ],
          },
        ],
      },
      {
        name: 'South 24 Parganas',
        blocks: [
          {
            name: 'Baruipur',
            villages: [
              { name: 'Begampur', contractors: ['Delta Grid Services', 'L&T Power Transmission'] },
              { name: 'Shankarpur', contractors: ['Eastern Line Services', 'Techno Electric'] },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'Odisha',
    districts: [
      {
        name: 'Khordha',
        blocks: [
          {
            name: 'Balianta',
            villages: [
              { name: 'Bainchua', contractors: ['Odisha Grid Solutions', 'Kalinga Power Projects'] },
              { name: 'Jagannathpur', contractors: ['Power Grid Corp', 'East Coast Electricals'] },
            ],
          },
        ],
      },
      {
        name: 'Cuttack',
        blocks: [
          {
            name: 'Baranga',
            villages: [
              { name: 'Belagachhia', contractors: ['Kalinga Power Projects', 'L&T Power Transmission'] },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'Bihar',
    districts: [
      {
        name: 'Patna',
        blocks: [
          {
            name: 'Phulwari Sharif',
            villages: [
              { name: 'Kurthaul', contractors: ['Bihar Grid Infra', 'Power Grid Corp'] },
              { name: 'Parsa', contractors: ['Magadh Electrical Works', 'North Grid Projects'] },
            ],
          },
        ],
      },
    ],
  },
];

export const ERECTION_LINE_TYPES = [
  { label: '11KV HT', value: 'HT_11KV' },
  { label: '33KV HT', value: 'HT_33KV' },
  { label: 'LT LINE', value: 'LT_440V' },
] as const;

export const LT_STARTING_POINT_OPTIONS = [
  { label: 'Tapping point from an HT line', value: 'HT_TAPPING_POINT' },
  { label: 'Starting from DTR', value: 'DTR' },
  { label: 'Starting from existing LT line', value: 'EXISTING_LT_LINE' },
] as const;
