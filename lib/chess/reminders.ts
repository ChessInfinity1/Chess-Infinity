export type PracticeReminder = { enabled: boolean; time: string; days: number[]; dismissedDay?: string; snoozeUntil?: string };
export const defaultReminder: PracticeReminder = { enabled: false, time: "18:00", days: [1,2,3,4,5] };
export const reminderDayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
export function normalizeReminder(raw?: Partial<PracticeReminder> | null): PracticeReminder {
  return {enabled:raw?.enabled===true,time:/^([01]\d|2[0-3]):[0-5]\d$/.test(raw?.time||"")?raw!.time!:defaultReminder.time,days:Array.isArray(raw?.days)?[...new Set(raw.days.filter(d=>Number.isInteger(d)&&d>=0&&d<=6))].sort():[...defaultReminder.days],dismissedDay:typeof raw?.dismissedDay==='string'?raw.dismissedDay:undefined,snoozeUntil:typeof raw?.snoozeUntil==='string'?raw.snoozeUntil:undefined};
}
export function reminderLocalDay(now:Date){return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;}
export function practiceReminderDue(raw:PracticeReminder|undefined,practicedDays:string[],now=new Date()){
 const r=normalizeReminder(raw),today=reminderLocalDay(now);if(!r.enabled||!r.days.includes(now.getDay())||practicedDays.includes(today)||r.dismissedDay===today)return false;if(r.snoozeUntil&&Date.parse(r.snoozeUntil)>now.getTime())return false;return now.getHours()*60+now.getMinutes()>=Number(r.time.slice(0,2))*60+Number(r.time.slice(3));
}
function fold(line:string){const parts:string[]=[];let current='',size=0;for(const char of line){const bytes=new TextEncoder().encode(char).length;if(size+bytes>75){parts.push(current);current=' ';size=1;}current+=char;size+=bytes;}parts.push(current);return parts.join('\r\n');}
export function practiceCalendar(raw:PracticeReminder,minutes:number,origin:string,now=new Date()){
 const r=normalizeReminder(raw);if(!r.days.length)throw new Error('Choose at least one practice day.');
 const start=new Date(now);start.setHours(Number(r.time.slice(0,2)),Number(r.time.slice(3)),0,0);for(let n=0;n<8&&(start<=now||!r.days.includes(start.getDay()));n++)start.setDate(start.getDate()+1);
 const date=reminderLocalDay(start).replaceAll('-',''),stamp=now.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z'),url=new URL('/?screen=learn',origin).href,byDay=['SU','MO','TU','WE','TH','FR','SA'],length=[10,15,30,45,60,90].includes(minutes)?minutes:15;
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Chess Infinity//Practice reminders//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:practice-${r.time.replace(':','')}-${r.days.join('')}@chess-infinity`,`DTSTAMP:${stamp}`,`DTSTART:${date}T${r.time.replace(':','')}00`,`DURATION:PT${length}M`,`RRULE:FREQ=WEEKLY;BYDAY=${r.days.map(d=>byDay[d]).join(',')};WKST=MO`,'SUMMARY:Chess Infinity practice',`DESCRIPTION:${length} minutes of chess. Start a lesson or revisit a puzzle.`,`URL:${url}`,'STATUS:CONFIRMED','TRANSP:TRANSPARENT','BEGIN:VALARM','ACTION:DISPLAY','TRIGGER:PT0S','DESCRIPTION:Time for your chess practice','END:VALARM','END:VEVENT','END:VCALENDAR'].map(fold).join('\r\n')+'\r\n';
}
