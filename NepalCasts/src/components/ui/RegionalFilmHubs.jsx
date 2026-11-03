import React, { useState, useEffect, memo } from 'react';
import {
  MapPin,
  Film,
  ChevronRight,
  Clapperboard,
  Mountain,
  Building2,
  Waves,
  Trees,
  Landmark,
  Castle,
  Compass,
  X,
  ShieldCheck,
  Sun
} from 'lucide-react';

export const PROVINCES_DATA = [
  {
    id: 'koshi',
    number: 1,
    name: 'Koshi Province',
    nepaliName: 'कोशी प्रदेश',
    tagline: 'Everest Heights, Tea Hills & Eastern Cinema',
    badge: 'कोशी प्रदेश • Alpine & Eastern Heritage',
    badgeColor: 'from-blue-500/20 to-indigo-600/10 text-blue-300 border-blue-500/30',
    accentColor: '#3b82f6',
    icon: Mountain,
    bgImage: '/assets/hubs/koshi.webp',
    capital: 'Biratnagar',
    elevation: '60m to 8,848m (Mt. Everest)',
    climate: 'Subtropical Plains to Arctic Glaciers',
    bestSeason: 'Oct - Dec & Mar - May',
    shortDescription: 'From Sagarmatha (Mt. Everest) to the misty tea gardens of Ilam and vibrant cultural theaters of Dharan.',
    about: 'Koshi Province spans the ultimate elevation contrast on Earth — from the tropical wetlands of Koshi Tappu to Mount Everest (8,848m). Steeped in Kirat, Rai, Limbu, and Sherpa heritage, it offers filmmakers dramatic high-altitude mountaineering spectacles, misty romantic tea estates, and grassroots indie theater hubs in Dharan and Biratnagar.',
    famousPlaces: [
      {
        name: 'Mount Everest & Khumbu Valley',
        district: 'Solukhumbu',
        terrain: 'High Altitude Alpine',
        highlight: 'World\'s ultimate extreme altitude cinema, Tengboche monastery, Namche Bazaar sherpa hub, and dramatic glacial moraines.',
      },
      {
        name: 'Ilam Tea Gardens & Kanyam',
        district: 'Ilam',
        terrain: 'Lush Hill Country',
        highlight: 'Rolling emerald green slopes, romantic fog aesthetics, cinematic drone sweeps, and premier music video destinations.',
      },
      {
        name: 'Bhedetar & Dharan',
        district: 'Sunsari',
        terrain: 'Sub-Himalayan Foothills',
        highlight: 'Gateway to the hills, Bhedetar viewpoint, vibrant modern youth culture, Aarohan Gurukul theater, and clock tower.',
      },
      {
        name: 'Barun Valley & Makalu',
        district: 'Sankhuwasabha',
        terrain: 'Glacial Deep Valley',
        highlight: 'Untouched prehistoric canyon valleys, towering granite cliffs, and cascading waterfalls for fantasy and adventure epics.',
      },
      {
        name: 'Koshi Tappu Wildlife Reserve',
        district: 'Sunsari / Saptari',
        terrain: 'Riverine Wetlands',
        highlight: 'Expansive wetlands, wild water buffaloes (Arna), 500+ bird species, and tranquil golden sunset water reflections.',
      },
    ],
    projectRelevance: {
      talentPool: 'Kirat, Limbu & Rai cultural dancers, Aarohan Gurukul theater actors, mountaineering sherpa crews, and multilingual voice talents registered on NepalCasts.',
      activeCasting: 'Mountaineering expedition documentaries, Purbeli folk music videos, Eastern diaspora features, and indie festival films.',
      productionSupport: 'High-altitude camera operators, drone expedition specialists, sound recordists in Biratnagar/Dharan, and local sherpa fixers.',
      permits: 'Sagarmatha National Park filming permits, Ministry of Information expedition clearances, and local municipal coordination via NepalCasts.',
      notableFilms: ['Caravan / Himalaya (Eastern passes)', 'Everest (Hollywood)', 'Kabaddi 4', 'Pooja, Sir'],
    },
    stats: {
      hotspotsCount: '5+ Major Hubs',
      registeredTalents: '380+ Talents',
      permitTurnaround: '48-72 hrs',
      elevationPeak: '8,848m',
    },
  },
  {
    id: 'madhesh',
    number: 2,
    name: 'Madhesh Province',
    nepaliName: 'मधेश प्रदेश',
    tagline: 'Mithila Heritage, Sacred Temples & Terai Drama',
    badge: 'मधेश प्रदेश • Cultural Cradle',
    badgeColor: 'from-rose-500/20 to-rose-600/10 text-rose-300 border-rose-500/30',
    accentColor: '#f43f5e',
    icon: Landmark,
    bgImage: '/assets/hubs/janakpur.webp',
    capital: 'Janakpurdham',
    elevation: '60m to 300m (Terai Plains)',
    climate: 'Subtropical / Tropical Warm',
    bestSeason: 'Oct - Mar (Milder Winter & Festive Season)',
    shortDescription: 'The vibrant cradle of ancient Mithila art, marble palace architecture of Janaki Mandir, and rich multilingual Terai culture.',
    about: 'Madhesh Province is the cultural and spiritual core of the southern plains of Nepal. Featuring ancient Mithila civilization, classical palace temples, colourful rural mud-house murals, and bustling border trade cities, it offers rich storytelling opportunities for period dramas, musicals, and social realism in Maithili, Bhojpuri, and Nepali.',
    famousPlaces: [
      {
        name: 'Janaki Mandir (Janakpurdham)',
        district: 'Dhanusha',
        terrain: 'Palatial Architecture',
        highlight: 'Majestic Mughal-Rajput white marble palace temple, 50-room architectural marvel, sacred Vivah Mandap, and grand historical sets.',
      },
      {
        name: 'Dhanushadham & Sacred Sagar Ponds',
        district: 'Dhanusha',
        terrain: 'Spiritual Water Ghats',
        highlight: 'Mythological Ramayana bow site, Ganga Sagar & Dhanush Sagar ghats with mesmerizing evening Aarti oil lamps and reflections.',
      },
      {
        name: 'Parsa National Park',
        district: 'Parsa',
        terrain: 'Subtropical Sal Jungle',
        highlight: 'Pristine sal forests, Asian wild elephants, royal Bengal tigers, and scenic raw wildlife cinematography without tourist crowds.',
      },
      {
        name: 'Mithila Art Villages (Kuwa & Janakpur Art Centers)',
        district: 'Dhanusha / Mahottari',
        terrain: 'Artisan Rural Village',
        highlight: 'Vibrant traditional wall frescoes, handmade clay courtyards, traditional handloom sarees, and authentic ethnic Terai life.',
      },
      {
        name: 'Birgunj Commercial Dry Port & Clock Tower',
        district: 'Parsa',
        terrain: 'Industrial & Urban',
        highlight: 'Industrial cargo hubs, vibrant night markets, cross-border dynamic scenes, and contemporary urban crime and trade narratives.',
      },
    ],
    projectRelevance: {
      talentPool: 'Maithili & Bhojpuri screen actors, Jhijhiya and folk dancers, classical vocalists, and bilingual stage actors on NepalCasts.',
      activeCasting: 'Regional OTT drama series, Bhojpuri commercial entertainment, Mithila historical documentaries, and festive music videos.',
      productionSupport: 'Bilingual sync-sound recordists, folk costume stylists, and art directors specialized in traditional Madheshi sets.',
      permits: 'Janakpur Greater Area Development Council permits, temple trust clearances, and Parsa conservation approvals assisted by NepalCasts.',
      notableFilms: ['Janaki (Historical)', 'Lorik (Mithila Folklore)', 'Bulbul (Southern sequences)', 'Chhakka Panja regional scenes'],
    },
    stats: {
      hotspotsCount: '5+ Major Hubs',
      registeredTalents: '290+ Talents',
      permitTurnaround: '24-48 hrs',
      elevationPeak: '300m',
    },
  },
  {
    id: 'bagmati',
    number: 3,
    name: 'Bagmati Province',
    nepaliName: 'बागमती प्रदेश',
    tagline: 'Film Industry Capital, UNESCO Squares & Modern Studios',
    badge: 'बागमती प्रदेश • Industry Capital',
    badgeColor: 'from-purple-500/20 to-purple-600/10 text-purple-300 border-purple-500/30',
    accentColor: '#8b5cf6',
    icon: Building2,
    bgImage: '/assets/hubs/kathmandu.webp',
    capital: 'Hetauda (Industry Center: Kathmandu)',
    elevation: '140m to 7,227m (Langtang Lirung)',
    climate: 'Temperate Valley to Alpine Glaciers',
    bestSeason: 'Year-round (Autumn & Spring peak)',
    shortDescription: 'The heartbeat of Nepali cinema — world heritage medieval durbar squares, advanced post-production studios, and Langtang peaks.',
    about: 'Bagmati Province is the epicentre of Nepal\'s entertainment industry. Encompassing the historic Kathmandu Valley, it houses the country\'s top casting directors, soundstages, post-production VFX facilities, and equipment rental houses. From the ancient pagoda courtyards of Patan to the snow peaks of Langtang and historic fortress of Sindhuligadhi, it provides endless film backdrops.',
    famousPlaces: [
      {
        name: 'Kathmandu, Patan & Bhaktapur Durbar Squares',
        district: 'Kathmandu / Lalitpur / Bhaktapur',
        terrain: 'Medieval UNESCO Architecture',
        highlight: 'UNESCO World Heritage medieval palace courtyards, intricately carved Newari wooden windows, stone temples, and timeless cinema heritage.',
      },
      {
        name: 'Pashupatinath & Boudhanath Stupa',
        district: 'Kathmandu',
        terrain: 'Spiritual Sacred Sites',
        highlight: 'Spiritual vortex, prayer wheels, butter lamps, serene morning monks, cremation ghats, and profound cinematic atmosphere.',
      },
      {
        name: 'Langtang Valley & Gosainkunda Lake',
        district: 'Rasuwa',
        terrain: 'Glacial Alpine Lakes',
        highlight: 'Glacial alpine lake at 4,380m, Tamang heritage trails, dramatic rock faces, and accessible mountain trekking cinema.',
      },
      {
        name: 'Sindhuligadhi Historic Stone Fort',
        district: 'Sindhuli',
        terrain: 'Historic Hilltop Fortress',
        highlight: 'Epic hilltop 18th-century battle fortress, military stone bastions, and panoramic views of the Mahabharat hills.',
      },
      {
        name: 'Chitwan Valley (Madi & Narayani Riverfront)',
        district: 'Chitwan',
        terrain: 'Subtropical Riverine Forest',
        highlight: 'Dense sal jungles, rhino crossings, wooden canoe river safaris, and tranquil jungle resorts.',
      },
    ],
    projectRelevance: {
      talentPool: 'Over 60% of Nepal\'s mainstream Kollywood actors, method artists, voice actors, stunt coordinators, and child talents.',
      activeCasting: 'National feature films, high-budget TV commercials (TVC), web series, music videos, and international co-productions.',
      productionSupport: 'Full rental houses (ARRI Alexa, RED, Sony FX9, Cooke/Zeiss cinema primes, DIT, cranes, gaffers, grading suites).',
      permits: 'Film Development Board (FDB), Department of Archaeology heritage permits, and Kathmandu Metropolitan liaison.',
      notableFilms: ['Loot', 'Pashupati Prasad', 'Kagbeni', 'Jatra', 'Doctor Strange (Marvel Studios)', 'Prem Geet 3'],
    },
    stats: {
      hotspotsCount: '6+ Major Hubs',
      registeredTalents: '1,200+ Talents',
      permitTurnaround: '24 hrs',
      elevationPeak: '7,227m',
    },
  },
  {
    id: 'gandaki',
    number: 4,
    name: 'Gandaki Province',
    nepaliName: 'गण्डकी प्रदेश',
    tagline: 'Annapurna Sanctuary, Lakeside Romance & Canyon Plateaus',
    badge: 'गण्डकी प्रदेश • Adventure & Romance',
    badgeColor: 'from-sky-500/20 to-sky-600/10 text-sky-300 border-sky-500/30',
    accentColor: '#0ea5e9',
    icon: Waves,
    bgImage: '/assets/hubs/pokhara.webp',
    capital: 'Pokhara',
    elevation: '200m to 8,167m (Dhaulagiri)',
    climate: 'Subtropical Lakes to Trans-Himalayan Desert',
    bestSeason: 'Sep - May (Clear Mountain Visibility)',
    shortDescription: 'Nepal’s premier visual playground: Pokhara’s lakeside reflections, Annapurna Base Camp, and the forbidden red cliffs of Mustang.',
    about: 'Gandaki Province is internationally revered for its jaw-dropping visual contrasts. It transitions in just 100km from the serene, subtropical waters of Phewa Lake in Pokhara to the wind-carved, Martian canyon cliffs of Upper Mustang. It is the number one choice in Nepal for music videos, romantic dramas, trekking epics, and international adventure cinema.',
    famousPlaces: [
      {
        name: 'Pokhara & Phewa Lake (Machhapuchhre View)',
        district: 'Kaski',
        terrain: 'Subtropical Lake & Peaks',
        highlight: 'Iconic wooden boats, Fishtail mountain reflection, Sarangkot sunrise drone flights, and vibrant international cafes.',
      },
      {
        name: 'Upper Mustang & Lo Manthang',
        district: 'Mustang',
        terrain: 'Trans-Himalayan Canyon Desert',
        highlight: 'Walled ancient kingdom, eroded yellow-red canyon cliffs, 10,000 prehistoric sky caves, and Tibetan Buddhist gompas.',
      },
      {
        name: 'Annapurna Base Camp (ABC) & Ghandruk',
        district: 'Kaski',
        terrain: 'Himalayan High Sanctuary',
        highlight: '360-degree amphitheater of 7,000m-8,000m snow giants, traditional stone Gurung architecture, and rhododendron forests.',
      },
      {
        name: 'Bandipur Heritage Town',
        district: 'Tanahun',
        terrain: 'Living Heritage Hill Station',
        highlight: 'Pristine 18th-century Newari hilltop trading post, European piazza vibe, and vehicle-free stone cobblestone lanes.',
      },
      {
        name: 'Muktinath & Kali Gandaki Gorge',
        district: 'Mustang',
        terrain: 'Sacred Mountain Pass',
        highlight: 'Deepest gorge in the world, sacred 108 waterspouts, and windy riverbeds with ancient Saligram fossils.',
      },
    ],
    projectRelevance: {
      talentPool: 'Gurung, Magar, and Thakali cultural performers, mountain action performers, adventure athletes, and Pokhara theater artists.',
      activeCasting: 'Romantic feature films, high-energy music videos, global trekking documentaries, and mountain action stunts.',
      productionSupport: 'Drone aerial operators, outdoor generator lighting kits, mountain fixers, and local logistics transport.',
      permits: 'ACAP (Annapurna Conservation Area Project) permits, Restricted Area Permits (RAP) for Upper Mustang, and CAAN drone clearances.',
      notableFilms: ['Kabaddi Series (1, 2, 3 & 4)', 'Shambala (Berlinale 2024)', 'Hostel', 'Prem Geet 2', 'Caravan'],
    },
    stats: {
      hotspotsCount: '5+ Major Hubs',
      registeredTalents: '650+ Talents',
      permitTurnaround: '48 hrs',
      elevationPeak: '8,167m',
    },
  },
  {
    id: 'lumbini',
    number: 5,
    name: 'Lumbini Province',
    nepaliName: 'लुम्बिनी प्रदेश',
    tagline: 'Birthplace of Buddha, Royal Bardiya & Palpa Heritage',
    badge: 'लुम्बिनी प्रदेश • Peace & Wilderness',
    badgeColor: 'from-amber-500/20 to-amber-600/10 text-amber-300 border-amber-500/30',
    accentColor: '#f59e0b',
    icon: Trees,
    bgImage: '/assets/hubs/lumbini.webp',
    capital: 'Deukhuri (Dang)',
    elevation: '100m to 1,936m',
    climate: 'Subtropical Terai to Mild Hill Climates',
    bestSeason: 'Oct - Apr (Dry and Pleasant)',
    shortDescription: 'World peace heritage at Buddha’s birthplace, Palpa’s historic neoclassical Rani Mahal, and wild Bengal tigers of Bardiya.',
    about: 'Lumbini Province offers an extraordinary combination of profound spiritual serenity and raw wilderness. Anchored by Lumbini Sacred Garden — the UNESCO birthplace of Siddhartha Gautama Buddha — the province extends into the dramatic river cliffs of Palpa\'s Rani Mahal ("Taj Mahal of Nepal") and the untamed royal Bengal tiger habitats of Bardiya National Park.',
    famousPlaces: [
      {
        name: 'Lumbini Sacred Garden & Maya Devi Temple',
        district: 'Rupandehi',
        terrain: 'UNESCO Peace Sanctuary',
        highlight: 'Universal birthplace of Buddha, Ashoka Pillar, monastic zone with 30+ international temples, World Peace Pagoda & lotus ponds.',
      },
      {
        name: 'Rani Mahal (Taj Mahal of Nepal)',
        district: 'Palpa',
        terrain: 'River Canyon Neoclassical Palace',
        highlight: 'Romantic 1890s neoclassical palace built on massive granite cliffs overlooking the roaring Kali Gandaki river canyon.',
      },
      {
        name: 'Bardiya National Park',
        district: 'Bardiya',
        terrain: 'Untamed Wilderness Jungle',
        highlight: 'Nepal\'s premier wild royal Bengal tiger habitat, wild Asian elephants, one-horned rhinos, and pristine riverine jungle.',
      },
      {
        name: 'Tansen Hill Station',
        district: 'Palpa',
        terrain: 'Historical Hill Capital',
        highlight: 'Historic capital of the Sen kingdom, cobblestone alleys, traditional Palpali Dhaka fabric looms, and views of Annapurna.',
      },
      {
        name: 'Jitgadhi Killa & Butwal',
        district: 'Rupandehi',
        terrain: 'Historic Military Fortress',
        highlight: 'Historical fortress where Nepali soldiers defeated the British East India Company in 1814, and rapid commercial hub.',
      },
    ],
    projectRelevance: {
      talentPool: 'Tharu cultural performance troupes, Awadhi & Bhojpuri actors, Buddhist devotional artists, and Palpali traditional artisans.',
      activeCasting: 'Spiritual & philosophical feature films, wildlife conservation docs, historical resistance dramas, and regional musicals.',
      productionSupport: 'Experienced wildlife tracking guides, location fixers in Butwal & Nepalgunj, and Terai camera support teams.',
      permits: 'Lumbini Development Trust (LDT) filming guidelines, Bardiya National Park Department of National Parks permits.',
      notableFilms: ['The Light of Asia', 'Aina Jhyal Ko Putali (Butterfly on the Windowpane)', 'Wild Nepal (BBC/NatGeo)', 'White Sun'],
    },
    stats: {
      hotspotsCount: '5+ Major Hubs',
      registeredTalents: '310+ Talents',
      permitTurnaround: '48 hrs',
      elevationPeak: '1,936m',
    },
  },
  {
    id: 'karnali',
    number: 6,
    name: 'Karnali Province',
    nepaliName: 'कर्णाली प्रदेश',
    tagline: 'Rara Queen of Lakes, Shey Phoksundo & Ancient Khas Origins',
    badge: 'कर्णाली प्रदेश • Untamed Frontier',
    badgeColor: 'from-teal-500/20 to-teal-600/10 text-teal-300 border-teal-500/30',
    accentColor: '#14b8a6',
    icon: Compass,
    bgImage: '/assets/hubs/karnali.webp',
    capital: 'Birendranagar (Surkhet)',
    elevation: '250m to 7,132m (Mount Kanjiroba)',
    climate: 'Cold Alpine & Trans-Himalayan Dry Plateau',
    bestSeason: 'Apr - Oct (Summer & Autumn Exploration)',
    shortDescription: 'The largest, most mystical province: pristine sapphire Rara Lake, turquoise Shey Phoksundo, and the cradle of the Nepali language.',
    about: 'Karnali Province is Nepal\'s wildest and most cinematic hidden treasure. Home to the magical deep-blue Rara Lake, the emerald-turquoise waters of Shey Phoksundo in Dolpo, and the Sinja Valley (birthplace of the Khas language and civilization). Its untouched landscapes, stone monuments, and mystical Bon culture provide unmatched authenticity for art-house, historical, and international festival films.',
    famousPlaces: [
      {
        name: 'Rara Lake (Queen of Lakes)',
        district: 'Mugu',
        terrain: 'Alpine Sapphire Lake',
        highlight: 'Nepal\'s largest lake at 2,990m, deep sapphire mirror water, surrounded by dense conifer pine forests and snow peaks.',
      },
      {
        name: 'Shey Phoksundo Lake & Dolpo',
        district: 'Dolpa',
        terrain: 'Turquoise High-Altitude Basin',
        highlight: 'Deepest alpine lake with supernatural turquoise waters, zero aquatic life, and 800-year-old Ringmo Bon monastery.',
      },
      {
        name: 'Sinja Valley (UNESCO Tentative)',
        district: 'Jumla',
        terrain: 'Ancient Valley Civilization',
        highlight: 'Ancient capital of the 12th-14th century Khas Malla empire, origin site of Devanagari Nepali script, and stone temples.',
      },
      {
        name: 'Dailekh (Panchadeval & Kotila)',
        district: 'Dailekh',
        terrain: 'Monolithic Stone Heritage',
        highlight: 'Centuries-old stone carved monolithic deval temples, and naturally burning eternal flame springs (Shiristhan & Navisthan).',
      },
      {
        name: 'Kakrebihar & Surkhet Valley',
        district: 'Surkhet',
        terrain: 'Archaeological Stone Ruins',
        highlight: 'Surkhet\'s restored medieval 12th-century stone Buddhist/Hindu shrine ruins, often referred to as Nepal\'s mini-Angkor Wat.',
      },
    ],
    projectRelevance: {
      talentPool: 'Khas language method actors, authentic Dolpo indigenous extras, Deuda folk vocalists, and rugged mountain trek performers.',
      activeCasting: 'Art-house cinema, festival competition entries, anthropological documentaries, and period historical features.',
      productionSupport: 'High-end expedition logistics, solar power film packs, satellite communication units, and local packhorse caravans.',
      permits: 'Shey Phoksundo National Park permits, Upper Dolpo restricted area approvals, and Karnali regional filming facilitation via NepalCasts.',
      notableFilms: ['Himalaya / Caravan (Oscar Nominated)', 'White Sun (Seto Surya - Venice Film Fest)', 'Ghaam Pani', 'Dokh'],
    },
    stats: {
      hotspotsCount: '5+ Major Hubs',
      registeredTalents: '190+ Talents',
      permitTurnaround: '72 hrs',
      elevationPeak: '7,132m',
    },
  },
  {
    id: 'sudurpashchim',
    number: 7,
    name: 'Sudurpashchim Province',
    nepaliName: 'सुदूरपश्चिम प्रदेश',
    tagline: 'Khaptad Rolling Meadows, Shuklaphanta & Deuda Culture',
    badge: 'सुदूरपश्चिम प्रदेश • Far-Western Frontier',
    badgeColor: 'from-emerald-500/20 to-emerald-600/10 text-emerald-300 border-emerald-500/30',
    accentColor: '#10b981',
    icon: Castle,
    bgImage: '/assets/hubs/sudurpashchim.webp',
    capital: 'Godawari (Commercial: Dhangadhi)',
    elevation: '109m to 7,132m (Api Peak)',
    climate: 'Subtropical Plains to Alpine Plateaus',
    bestSeason: 'Sep - Nov & Mar - Jun',
    shortDescription: 'The far-western frontier: mystical rolling green plateaus of Khaptad, vast wild deer grasslands of Shuklaphanta, and Deuda folklore.',
    about: 'Sudurpashchim Province is a mesmerizing, largely undiscovered filmmaking paradise. From the rolling green alpine moorlands of Khaptad National Park with its 22 open meadows to the vast flat grasslands of Shuklaphanta boasting the world\'s largest swamp deer herds, and the energetic Chholiya sword dance tradition, it offers producers completely original visuals away from commercial crowds.',
    famousPlaces: [
      {
        name: 'Khaptad National Park',
        district: 'Doti / Achham / Bajhang / Bajura',
        terrain: 'Alpine Moorlands & Meadows',
        highlight: 'Vast emerald high-altitude plateau, 22 rolling green meadows (patans), Khaptad Baba hermitage, fairy-tale mist and wildflowers.',
      },
      {
        name: 'Shuklaphanta National Park',
        district: 'Kanchanpur',
        terrain: 'Vast Grassland Savannah',
        highlight: 'Largest continuous grassland in Asia, 2,000+ swamp deer (Barasingha), Rani Tal wetlands, and open savannah cinematography.',
      },
      {
        name: 'Karnali Bridge (Chisapani)',
        district: 'Kailali / Bardiya border',
        terrain: 'Iconic Engineering Landmark',
        highlight: 'Stunning single-tower cable-stayed architectural suspension bridge spanning the emerald Karnali river, dramatic drone angle.',
      },
      {
        name: 'Api Nampa Conservation Area',
        district: 'Darchula',
        terrain: 'Remote Glaciated Massif',
        highlight: 'Remote, pristine glaciated peaks (Mt. Api 7,132m), untouched nomadic Byas communities, and raw Himalayan nature.',
      },
      {
        name: 'Amargadhi Fort (Dadeldhura)',
        district: 'Dadeldhura',
        terrain: 'Pine Ridge Fortress',
        highlight: 'Historic stone fortress named after General Amar Singh Thapa, guarding old trade routes amidst fragrant pine ridges.',
      },
    ],
    projectRelevance: {
      talentPool: 'Doteli & Bajhangi dialect actors, Chholiya sword dancers, traditional Deuda singers and musicians, and indigenous Tharu dancers.',
      activeCasting: 'Regional musical productions, folklore dramas, ecological and wildlife films, and cross-border social documentaries.',
      productionSupport: 'Regional camera and lighting fixers based in Dhangadhi & Mahendranagar, and local transportation network.',
      permits: 'Khaptad & Shuklaphanta National Park clearances, and Far-Western Tourism Promotion board liaison assisted by NepalCasts.',
      notableFilms: ['Chhakka Panja regional songs', 'Deuda cultural cinema', 'Wild Plains of Kanchanpur (Documentary)', 'Mahendranagar indie features'],
    },
    stats: {
      hotspotsCount: '5+ Major Hubs',
      registeredTalents: '220+ Talents',
      permitTurnaround: '48 hrs',
      elevationPeak: '7,132m',
    },
  },
];

const RegionalFilmHubs = memo(function RegionalFilmHubs({ onNavigate }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeProvinceId, setActiveProvinceId] = useState('koshi');
  const [activeSubTab, setActiveSubTab] = useState('all'); // 'all', 'places', 'project'

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const handleOpenModal = (provinceId = 'koshi') => {
    setActiveProvinceId(provinceId);
    setActiveSubTab('all');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleBrowseTalents = (province) => {
    setIsModalOpen(false);
    if (onNavigate) {
      onNavigate('listing');
    }
  };

  const handleBrowseAuditions = (province) => {
    setIsModalOpen(false);
    if (onNavigate) {
      onNavigate('casting');
    }
  };

  const activeProvince = PROVINCES_DATA.find((p) => p.id === activeProvinceId) || PROVINCES_DATA[0];

  return (
    <section className="bg-white rounded-2xl border border-[#E7E5E0] p-4 sm:p-5 text-[#202923] shadow-card select-none">
      {/* Section Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="space-y-1">
          <span className="relative inline-flex items-center pb-2 text-[#202923] font-serif font-semibold text-xl sm:text-2xl tracking-normal select-none">
            <span className="absolute bottom-0 left-0 w-3/4 h-[2px] bg-[#194332] rounded-full pointer-events-none" />
            Regional Film Hubs
          </span>
          <p className="text-xs sm:text-sm text-[#626860] font-normal">
            Cinema hubs across Nepal
          </p>
        </div>

        {/* View All Button */}
        <button
          type="button"
          onClick={() => handleOpenModal('koshi')}
          className="text-[#626860] hover:text-[#194332] text-xs sm:text-sm font-semibold flex items-center gap-1 cursor-pointer shrink-0 pt-1 transition-colors group"
        >
          <span>View all</span>
          <ChevronRight className="w-4 h-4 text-[#626860] group-hover:text-[#194332] group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Horizontal Cinematic Hub Cards (7 Provinces) */}
      <div className="flex gap-3 sm:gap-4 overflow-x-auto pt-1 pb-2 px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] scroll-smooth">
        {PROVINCES_DATA.map((hub) => {
          const IconComponent = hub.icon;
          return (
            <div
              key={hub.id}
              onClick={() => handleOpenModal(hub.id)}
              className="relative shrink-0 w-[82vw] sm:w-[320px] md:w-[340px] rounded-2xl overflow-hidden border border-[#E7E5E0] hover:border-[#D5D1C7] group cursor-pointer shadow-card hover:shadow-elevated transition-all duration-300 flex flex-col justify-between bg-white"
            >
              {/* Background Landscape Photo with Cinematic Dark Gradient */}
              <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-[#202923]">
                <img
                  src={hub.bgImage}
                  alt={hub.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-95"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#202923] via-[#202923]/40 to-transparent pointer-events-none" />

                {/* Top Province Badge */}
                <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-black/60 backdrop-blur-md text-white border border-white/20"
                  >
                    <IconComponent className="w-3 h-3 text-white" />
                    <span>{hub.nepaliName}</span>
                  </span>
                </div>

                {/* Hub Title on Bottom of Image */}
                <div className="absolute bottom-2.5 left-3 right-3 z-10 text-left">
                  <h3 className="text-lg sm:text-xl font-serif font-semibold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-tight">
                    {hub.name}
                  </h3>
                  <p className="text-xs text-white/80 font-normal truncate drop-shadow-sm">
                    {hub.tagline}
                  </p>
                </div>
              </div>

              {/* Card Body Details */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3 text-left">
                <p className="text-xs text-[#626860] line-clamp-2 leading-relaxed">
                  {hub.shortDescription}
                </p>

                {/* Key Sub-Locations / Hotspots */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1 text-[11px] uppercase font-semibold text-[#777C75] tracking-wider">
                    <MapPin className="w-3.5 h-3.5 text-[#194332] shrink-0" />
                    <span>Top Filming Locations</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 pt-0.5">
                    {hub.famousPlaces.slice(0, 3).map((loc, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] text-[#414840] bg-[#F3F0E9] px-2 py-0.5 rounded-md border border-[#E7E5E0] truncate max-w-[130px]"
                        title={loc.name}
                      >
                        {loc.name.split('&')[0].trim()}
                      </span>
                    ))}
                    {hub.famousPlaces.length > 3 && (
                      <span className="text-[11px] text-[#194332] font-semibold bg-[#EAF2ED] px-1.5 py-0.5 rounded-md border border-[#E7E5E0]">
                        +{hub.famousPlaces.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* View Details Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenModal(hub.id);
                    }}
                    className="w-full py-2.5 px-3 rounded-lg text-xs font-semibold bg-[#194332] hover:bg-[#102F28] text-white transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98]"
                  >
                    <span>Explore Hub</span>
                    <ChevronRight className="w-3.5 h-3.5 text-white group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* COMPREHENSIVE 7 PROVINCES REGIONAL FILM HUBS MODAL EXPLORER               */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-[#202923]/60 backdrop-blur-sm animate-fade-in"
          onClick={handleCloseModal}
        >
          <div
            className="relative w-full max-w-4xl max-h-[92vh] rounded-2xl overflow-hidden bg-[#FAF8F4] border border-[#E7E5E0] shadow-dropdown flex flex-col text-left text-[#202923]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Sticky Header */}
            <div className="shrink-0 px-5 sm:px-6 py-4 border-b border-[#E7E5E0] bg-white flex items-center justify-between gap-4 z-20">
              <div className="flex items-center gap-3 min-w-0">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#F3F0E9] text-[#194332] text-sm font-semibold shrink-0">
                  {React.createElement(activeProvince.icon, { className: 'w-4 h-4 text-[#194332]' })}
                </span>
                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-serif font-semibold tracking-tight text-[#202923] truncate">
                      {activeProvince.name}
                    </h2>
                    <span className="text-xs sm:text-sm font-semibold text-[#194332] shrink-0">
                      {activeProvince.nepaliName}
                    </span>
                  </div>
                  <p className="text-xs text-[#626860] mt-0.5 truncate">
                    Regional Cinema Profile & Filming Locations
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={handleCloseModal}
                className="w-9 h-9 rounded-full bg-[#F3F0E9] hover:bg-[#E7E5E0] text-[#202923] flex items-center justify-center cursor-pointer transition-colors shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-[#202923]" />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-6">
              {/* Province Hero Banner */}
              <div className="relative rounded-xl overflow-hidden bg-[#202923] min-h-[200px] sm:min-h-[240px] flex flex-col justify-end p-5 sm:p-6 shadow-card">
                <img
                  src={activeProvince.bgImage}
                  alt={activeProvince.name}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover opacity-70"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#202923] via-[#202923]/50 to-transparent pointer-events-none" />

                {/* Badges on Top of Banner */}
                <div className="relative z-10 flex flex-wrap items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-black/60 backdrop-blur-md text-white border border-white/20">
                    {React.createElement(activeProvince.icon, { className: 'w-3.5 h-3.5 text-white' })}
                    <span>{activeProvince.badge}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-black/50 backdrop-blur-md text-white border border-white/20">
                    <Building2 className="w-3.5 h-3.5 text-white" />
                    <span>Capital: {activeProvince.capital}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-black/50 backdrop-blur-md text-white border border-white/20">
                    <Sun className="w-3.5 h-3.5 text-white" />
                    <span>Season: {activeProvince.bestSeason}</span>
                  </span>
                </div>

                {/* Title and Tagline */}
                <div className="relative z-10">
                  <div className="flex flex-wrap items-baseline gap-2 sm:gap-3">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-semibold text-white tracking-tight">
                      {activeProvince.name}
                    </h1>
                    <span className="text-base sm:text-xl font-serif text-[#D4A373]">
                      {activeProvince.nepaliName}
                    </span>
                  </div>
                  <p className="text-sm sm:text-base text-white/90 font-normal mt-1">
                    {activeProvince.tagline}
                  </p>
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white border border-[#E7E5E0] rounded-xl p-3.5 text-center shadow-card">
                  <p className="text-[10px] uppercase font-semibold text-[#777C75] tracking-wider">Top Hotspots</p>
                  <p className="text-base sm:text-lg font-serif font-semibold text-[#202923] mt-0.5 tracking-tight">{activeProvince.stats.hotspotsCount}</p>
                </div>
                <div className="bg-white border border-[#E7E5E0] rounded-xl p-3.5 text-center shadow-card">
                  <p className="text-[10px] uppercase font-semibold text-[#777C75] tracking-wider">Capital City</p>
                  <p className="text-base sm:text-lg font-serif font-semibold text-[#194332] mt-0.5 truncate tracking-tight">{activeProvince.capital.split('(')[0].trim()}</p>
                </div>
                <div className="bg-white border border-[#E7E5E0] rounded-xl p-3.5 text-center shadow-card">
                  <p className="text-[10px] uppercase font-semibold text-[#777C75] tracking-wider">Best Season</p>
                  <p className="text-xs sm:text-sm font-semibold text-[#286847] mt-1 truncate tracking-tight">{activeProvince.bestSeason.split('(')[0].trim()}</p>
                </div>
                <div className="bg-white border border-[#E7E5E0] rounded-xl p-3.5 text-center shadow-card">
                  <p className="text-[10px] uppercase font-semibold text-[#777C75] tracking-wider">Elevation Peak</p>
                  <p className="text-base sm:text-lg font-serif font-semibold text-[#202923] mt-0.5 tracking-tight">{activeProvince.stats.elevationPeak}</p>
                </div>
              </div>

              {/* Section 1: About That Province */}
              <div className="bg-white rounded-xl border border-[#E7E5E0] p-4 sm:p-5 space-y-3 shadow-card">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-[#194332]" />
                  <h3 className="text-sm sm:text-base font-serif font-semibold text-[#202923] tracking-wide">
                    About {activeProvince.name} & Cinema Significance
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-[#414840] leading-relaxed">
                  {activeProvince.about}
                </p>

                {/* Notable Films Badges */}
                <div className="pt-2">
                  <p className="text-[11px] font-semibold text-[#777C75] uppercase tracking-wider mb-2">
                    Notable Films & Productions Shot Here:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {activeProvince.projectRelevance.notableFilms.map((film, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 text-xs font-medium bg-[#F3F0E9] text-[#194332] border border-[#E7E5E0] px-2.5 py-1 rounded-md"
                      >
                        <Clapperboard className="w-3.5 h-3.5 text-[#194332]" />
                        <span>{film}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Section 2: Famous Places & Filming Hotspots */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#194332]" />
                    <h3 className="text-sm sm:text-base font-serif font-semibold text-[#202923] tracking-wide">
                      Famous Filming Locations in {activeProvince.name}
                    </h3>
                  </div>
                  <span className="text-xs text-[#777C75]">
                    {activeProvince.famousPlaces.length} Iconic Locations
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeProvince.famousPlaces.map((place, idx) => (
                    <div
                      key={idx}
                      className="bg-white hover:border-[#D5D1C7] border border-[#E7E5E0] rounded-xl p-4 transition-all space-y-2 group shadow-card"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-semibold text-[#202923] group-hover:text-[#194332] transition-colors">
                            {place.name}
                          </h4>
                          <span className="text-xs text-[#777C75] font-normal">
                            District: {place.district}
                          </span>
                        </div>
                        <span className="text-[11px] font-medium bg-[#F3F0E9] border border-[#E7E5E0] text-[#414840] px-2 py-0.5 rounded-full shrink-0">
                          {place.terrain}
                        </span>
                      </div>
                      <p className="text-xs text-[#626860] leading-relaxed">
                        {place.highlight}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Bottom Action Footer */}
            <div className="shrink-0 px-5 sm:px-6 py-4 border-t border-[#E7E5E0] bg-white flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-[#626860]">
                <ShieldCheck className="w-4 h-4 text-[#194332]" />
                <span>NepalCasts • Cinema & Talent Network</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleBrowseTalents(activeProvince)}
                  className="flex-1 sm:flex-initial py-2.5 px-4 rounded-lg text-xs font-semibold bg-white hover:bg-[#F3F0E9] border border-[#D5D1C7] text-[#202923] transition-all text-center cursor-pointer active:scale-95 shadow-sm"
                >
                  Explore {activeProvince.name.replace(' Province', '')} Talents
                </button>
                <button
                  type="button"
                  onClick={() => handleBrowseAuditions(activeProvince)}
                  className="flex-1 sm:flex-initial py-2.5 px-4 rounded-lg text-xs font-semibold bg-[#194332] hover:bg-[#102F28] text-white transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                >
                  <Clapperboard className="w-3.5 h-3.5 text-white" />
                  <span>View Auditions</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
});

RegionalFilmHubs.displayName = 'RegionalFilmHubs';

export default RegionalFilmHubs;
