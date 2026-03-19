const fs = require('fs');
const path = require('path');

function getFiles(dir) {
  const files = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (['node_modules','.next','.git'].includes(f)) continue;
    if (fs.statSync(full).isDirectory()) files.push(...getFiles(full));
    else if (f.endsWith('.tsx')) files.push(full);
  }
  return files;
}

const base = 'C:/Users/tofik/Downloads/rabt-hq-project/rabt-hq/app';
const files = getFiles(base);

const fixes = [
  ['fontSize: 20, padding: 4 }}>??</button>', 'fontSize: 20, padding: 4 }}>✕</button>'],
  ['fontSize: 14 }}>?</button>', 'fontSize: 14 }}>✕</button>'],
  ['fontSize: 18 }}>?</button>', 'fontSize: 18 }}>✕</button>'],
  ['fontSize: 20 }}>?</span>', 'fontSize: 20 }}>☰</span>'],
  ["icon: '??', sub: 'UPI / Online'", "icon: '💳', sub: 'UPI / Online'"],
  ["icon: '??', sub: 'Pay later'", "icon: '💵', sub: 'Pay later'"],
  ['>?? WhatsApp<', '>💬 WhatsApp<'],
  ['>?? Call<', '>📞 Call<'],
  ['>?? Import CSV<', '>📥 Import CSV<'],
  ["'?? Analytics'", "'📊 Analytics'"],
  ["'?? Assign karo'", "'👆 Assign karo'"],
  ["'?? Assign'", "'👆 Assign'"],
  [">?? Import Leads<", ">📥 Import Leads<"],
  ["commission pending. ??", "commission pending. 🎉"],
  ["appointment. ??", "appointment. 🌿"],
  [">??<", ">🌿<"],
];

let totalFixed = 0;
for (const f of files) {
  let content = fs.readFileSync(f, 'utf8');
  let changed = false;
  for (const [find, replace] of fixes) {
    if (content.includes(find)) {
      content = content.split(find).join(replace);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(f, content, 'utf8');
    console.log('Fixed: ' + path.basename(f) + ' (' + path.dirname(f).split('\\').pop() + ')');
    totalFixed++;
  }
}
console.log('Total files fixed: ' + totalFixed);
