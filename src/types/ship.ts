export interface ShipState {
  mmsi: string
  name: string
  latitude: number
  longitude: number
  cog: number
  sog: number
  heading: number
  shipType: number
  navStatus: number
  destination: string
  eta: string
  dimensions: { a: number; b: number; c: number; d: number } | null
  lastUpdated: number
}

export const SHIP_TYPE_MAP: Record<number, { name: string; color: string }> = {
  20: { name: 'Wing in Ground', color: '#FF5722' },
  30: { name: 'Fishing Vessel', color: '#00BCD4' },
  31: { name: 'Towing Vessel', color: '#795548' },
  32: { name: 'Towing Vessel', color: '#795548' },
  33: { name: 'Dredger', color: '#795548' },
  34: { name: 'Diving Operations', color: '#00BCD4' },
  35: { name: 'Military', color: '#455A64' },
  36: { name: 'Sailing Yacht', color: '#4CAF50' },
  37: { name: 'Motor Yacht', color: '#4CAF50' },
  50: { name: 'Pilot Vessel', color: '#FF9800' },
  51: { name: 'Search & Rescue', color: '#FF5722' },
  52: { name: 'Tug', color: '#795548' },
  53: { name: 'Port Tender', color: '#FF9800' },
  55: { name: 'Law Enforcement', color: '#455A64' },
  58: { name: 'Medical Transport', color: '#F44336' },
  59: { name: 'Special Craft', color: '#9C27B0' },
  60: { name: 'Passenger Ship', color: '#2196F3' },
  69: { name: 'Passenger Ferry', color: '#2196F3' },
  70: { name: 'Cargo Ship', color: '#607D8B' },
  80: { name: 'Tanker', color: '#F44336' },
}

export function getShipType(code: number): { name: string; color: string } {
  if (SHIP_TYPE_MAP[code]) return SHIP_TYPE_MAP[code]
  if (code >= 60 && code <= 69) return { name: 'Passenger Ship', color: '#2196F3' }
  if (code >= 70 && code <= 79) return { name: 'Cargo Ship', color: '#607D8B' }
  if (code >= 80 && code <= 89) return { name: 'Tanker', color: '#F44336' }
  if (code >= 40 && code <= 49) return { name: 'High-speed Craft', color: '#FF5722' }
  if (code >= 20 && code <= 29) return { name: 'Wing in Ground', color: '#FF5722' }
  return { name: 'Vessel', color: '#9E9E9E' }
}

// MMSI Maritime Identification Digit → flag country
const MID_FLAGS: Record<number, string> = {
  201: '🇦🇱', 203: '🇦🇹', 205: '🇧🇪', 207: '🇧🇬', 209: '🇨🇾', 210: '🇨🇾',
  211: '🇩🇪', 212: '🇨🇾', 213: '🇬🇪', 214: '🇲🇩', 215: '🇲🇹', 216: '🇦🇲',
  218: '🇩🇪', 219: '🇩🇰', 220: '🇩🇰', 224: '🇪🇸', 225: '🇪🇸', 226: '🇫🇷',
  227: '🇫🇷', 228: '🇫🇷', 229: '🇲🇹', 230: '🇫🇮', 231: '🇫🇴', 232: '🇬🇧',
  233: '🇬🇧', 234: '🇬🇧', 235: '🇬🇧', 236: '🇬🇮', 237: '🇬🇷', 238: '🇭🇷',
  239: '🇬🇷', 240: '🇬🇷', 241: '🇬🇷', 242: '🇲🇦', 243: '🇭🇺', 244: '🇳🇱',
  245: '🇳🇱', 246: '🇳🇱', 247: '🇮🇹', 248: '🇲🇹', 249: '🇲🇹', 250: '🇮🇪',
  251: '🇮🇸', 252: '🇱🇮', 253: '🇱🇺', 254: '🇲🇨', 255: '🇵🇹', 256: '🇲🇹',
  257: '🇳🇴', 258: '🇳🇴', 259: '🇳🇴', 261: '🇵🇱', 263: '🇵🇹', 264: '🇷🇴',
  265: '🇸🇪', 266: '🇸🇪', 267: '🇸🇰', 268: '🇸🇲', 269: '🇨🇭',
  270: '🇨🇿', 271: '🇹🇷', 272: '🇺🇦', 273: '🇷🇺', 274: '🇲🇰',
  275: '🇱🇻', 276: '🇪🇪', 277: '🇱🇹', 278: '🇸🇮', 279: '🇷🇸',
  301: '🇦🇮', 303: '🇺🇸', 304: '🇦🇬', 305: '🇦🇬', 306: '🇳🇱',
  307: '🇳🇱', 308: '🇧🇸', 309: '🇧🇸', 310: '🇧🇲', 311: '🇧🇸',
  312: '🇧🇿', 314: '🇧🇧', 316: '🇨🇦', 319: '🇰🇾',
  325: '🇨🇷', 327: '🇨🇺', 329: '🇬🇵', 330: '🇩🇲',
  338: '🇺🇸', 339: '🇺🇸', 341: '🇬🇹', 345: '🇲🇽',
  351: '🇺🇸', 352: '🇺🇸', 353: '🇺🇸', 354: '🇺🇸', 355: '🇺🇸',
  366: '🇺🇸', 367: '🇺🇸', 368: '🇺🇸', 369: '🇺🇸',
  370: '🇵🇦', 371: '🇵🇦', 372: '🇵🇦', 373: '🇵🇦',
  374: '🇵🇦', 375: '🇵🇦', 376: '🇵🇦', 377: '🇵🇦',
  378: '🇻🇬', 379: '🇻🇮',
  401: '🇦🇫', 403: '🇸🇦', 405: '🇧🇩', 408: '🇧🇭',
  410: '🇧🇹', 412: '🇨🇳', 413: '🇨🇳', 414: '🇨🇳',
  416: '🇹🇼', 417: '🇱🇰', 419: '🇮🇳', 422: '🇮🇷',
  431: '🇯🇵', 432: '🇯🇵', 440: '🇰🇷', 441: '🇰🇷',
  445: '🇰🇵', 447: '🇰🇼', 450: '🇱🇧',
  455: '🇲🇻', 457: '🇲🇳', 459: '🇳🇵', 461: '🇴🇲',
  463: '🇵🇰', 466: '🇶🇦', 468: '🇸🇾', 470: '🇦🇪',
  471: '🇦🇪', 472: '🇹🇯', 473: '🇾🇪', 475: '🇮🇶',
  477: '🇭🇰', 478: '🇧🇦',
  501: '🇫🇷', 503: '🇦🇺', 506: '🇲🇲', 508: '🇧🇳',
  510: '🇫🇲', 511: '🇵🇼', 512: '🇳🇿', 514: '🇰🇭',
  515: '🇰🇭', 516: '🇨🇽', 518: '🇨🇰', 520: '🇫🇯',
  525: '🇮🇩', 529: '🇰🇮', 531: '🇱🇦', 533: '🇲🇾',
  536: '🇳🇷', 538: '🇲🇭', 540: '🇳🇨', 542: '🇳🇺',
  544: '🇳🇷', 546: '🇫🇷', 548: '🇵🇭', 553: '🇵🇬',
  555: '🇵🇳', 557: '🇸🇧', 559: '🇦🇸', 561: '🇼🇸',
  563: '🇸🇬', 564: '🇸🇬', 565: '🇸🇬', 566: '🇸🇬',
  567: '🇹🇭', 570: '🇹🇴', 572: '🇹🇻', 574: '🇻🇳',
  576: '🇻🇺', 577: '🇻🇺', 578: '🇼🇫',
  601: '🇿🇦', 603: '🇦🇴', 605: '🇩🇿', 607: '🇫🇷',
  609: '🇧🇮', 610: '🇧🇯', 611: '🇧🇼', 612: '🇨🇲',
  613: '🇨🇻', 615: '🇨🇬', 616: '🇰🇲', 617: '🇨🇩',
  618: '🇨🇮', 619: '🇩🇯', 620: '🇪🇬', 621: '🇬🇶',
  622: '🇪🇹', 624: '🇪🇷', 625: '🇬🇦', 626: '🇬🇭',
  627: '🇬🇲', 629: '🇬🇳', 630: '🇬🇼', 631: '🇬🇳',
  632: '🇱🇧', 633: '🇱🇷', 634: '🇱🇷', 635: '🇱🇷',
  636: '🇱🇷', 637: '🇱🇷', 642: '🇱🇾', 644: '🇲🇬',
  645: '🇲🇼', 647: '🇲🇱', 649: '🇲🇷', 650: '🇲🇺',
  654: '🇲🇿', 655: '🇳🇦', 656: '🇳🇪', 657: '🇳🇬',
  659: '🇷🇪', 660: '🇷🇼', 661: '🇸🇹', 662: '🇸🇳',
  663: '🇸🇨', 664: '🇸🇱', 665: '🇸🇴', 666: '🇸🇴',
  667: '🇸🇿', 668: '🇸🇩', 669: '🇸🇩', 670: '🇹🇩',
  671: '🇹🇬', 672: '🇹🇳', 674: '🇹🇿', 675: '🇺🇬',
  676: '🇨🇩', 677: '🇹🇿', 678: '🇿🇲', 679: '🇿🇼',
}

export function getFlag(mmsi: string): string {
  const mid = parseInt(mmsi.substring(0, 3))
  return MID_FLAGS[mid] || ''
}

export const NAV_STATUS: Record<number, string> = {
  0: 'Under way',
  1: 'At anchor',
  2: 'Not under command',
  3: 'Restricted',
  5: 'Moored',
  7: 'Fishing',
  8: 'Sailing',
  14: 'SAR',
}
