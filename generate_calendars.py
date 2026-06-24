import os
import csv
import re
import json
from datetime import datetime, timedelta

COUNTRY_FLAGS = {
    "Algeria": "🇩🇿",
    "Argentina": "🇦🇷",
    "Australia": "🇦🇺",
    "Austria": "🇦🇹",
    "Belgium": "🇧🇪",
    "Bosnia and Herzegovina": "🇧🇦",
    "Brazil": "🇧🇷",
    "Canada": "🇨🇦",
    "Cape Verde": "🇨🇻",
    "Colombia": "🇨🇴",
    "Croatia": "🇭🇷",
    "Curaçao": "🇨🇼",
    "Czech Republic": "🇨🇿",
    "DR Congo": "🇨🇩",
    "Ecuador": "🇪🇨",
    "Egypt": "🇪🇬",
    "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    "France": "🇫🇷",
    "Germany": "🇩🇪",
    "Ghana": "🇬🇭",
    "Haiti": "🇭🇹",
    "Iran": "🇮🇷",
    "Iraq": "🇮🇶",
    "Ivory Coast": "🇨🇮",
    "Japan": "🇯🇵",
    "Jordan": "🇯🇴",
    "Mexico": "🇲🇽",
    "Morocco": "🇲🇦",
    "Netherlands": "🇳🇱",
    "New Zealand": "🇳🇿",
    "Norway": "🇳🇴",
    "Panama": "🇵🇦",
    "Paraguay": "🇵🇾",
    "Portugal": "🇵🇹",
    "Qatar": "🇶🇦",
    "Saudi Arabia": "🇸🇦",
    "Scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
    "Senegal": "🇸🇳",
    "South Africa": "🇿🇦",
    "South Korea": "🇰🇷",
    "Spain": "🇪🇸",
    "Sweden": "🇸🇪",
    "Switzerland": "🇨🇭",
    "Tunisia": "🇹🇳",
    "Turkey": "🇹🇷",
    "United States": "🇺🇸",
    "Uruguay": "🇺🇾",
    "Uzbekistan": "🇺🇿",
}


def get_flag_emoji(country_name):
    if not country_name:
        return "⚽"
    if (
        country_name.startswith("Winner")
        or country_name.startswith("Runner-up")
        or country_name.startswith("3rd")
        or country_name.startswith("Loser")
    ):
        return "⚽"
    return COUNTRY_FLAGS.get(country_name, "⚽")


def clean_filename(name):
    # Replace spaces with underscores and remove special characters
    cleaned = re.sub(r"[^a-zA-Z0-9\s-]", "", name)
    return cleaned.strip().replace(" ", "_")


def format_ics_date(dt_str):
    # Input format: 2026-06-11T11:00:00Z
    # Output format: 20260611T110000Z
    dt = datetime.strptime(dt_str, "%Y-%m-%dT%H:%M:%SZ")
    return dt.strftime("%Y%m%dT%H%M%SZ"), dt


def generate_ics_content(matches, title_suffix):
    ics = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//FIFA World Cup 2026 Calendar//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        f"X-WR-CALNAME:FIFA World Cup 2026 - {title_suffix}",
        "X-WR-TIMEZONE:UTC",
        "X-WR-CALDESC:FIFA World Cup 2026 Matches Calendar",
    ]

    now_str = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")

    for idx, match in enumerate(matches):
        start_ics, start_dt = format_ics_date(match["time"])
        # Match matches typically last about 2 hours
        end_dt = start_dt + timedelta(hours=2)
        end_ics = end_dt.strftime("%Y%m%dT%H%M%SZ")

        flag_a = get_flag_emoji(match["country_a"])
        flag_b = get_flag_emoji(match["country_b"])
        summary = f"{flag_a} {match['country_a']} vs {flag_b} {match['country_b']}"
        location = match["location"]

        desc_parts = [f"FIFA World Cup 2026", f"Stage: {match['stage']}"]
        if match["group"]:
            desc_parts.append(f"Group: {match['group']}")
        desc_parts.append(f"Venue: {location}")

        description = "\\n".join(desc_parts)
        orig_a = match.get("original_country_a", match["country_a"])
        orig_b = match.get("original_country_b", match["country_b"])
        uid = f"match_2026_{idx}_{clean_filename(orig_a)}_vs_{clean_filename(orig_b)}@worldcupcalendar.football"

        ics.extend(
            [
                "BEGIN:VEVENT",
                f"UID:{uid}",
                f"DTSTAMP:{now_str}",
                f"DTSTART:{start_ics}",
                f"DTEND:{end_ics}",
                f"SUMMARY:{summary}",
                f"LOCATION:{location}",
                f"DESCRIPTION:{description}",
                "END:VEVENT",
            ]
        )

    ics.append("END:VCALENDAR")
    return "\n".join(ics)


def content_changed(file_path, new_content):
    if not os.path.exists(file_path):
        return True
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            old_content = f.read()

        def normalize(text):
            lines = [line.strip() for line in text.splitlines()]
            return "\n".join([line for line in lines if line and not line.startswith("DTSTAMP:")])

        return normalize(old_content) != normalize(new_content)
    except Exception:
        return True


def main():
    csv_path = "public/worldcup_2026_schedule.csv"
    output_dir = "public/calendars"
    mappings_path = "public/knockout_mappings.json"

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # Load knockout mappings
    mappings = {}
    if os.path.exists(mappings_path):
        try:
            with open(mappings_path, "r", encoding="utf-8") as f:
                mappings = json.load(f)
        except Exception as e:
            print(f"Warning: Could not load knockout mappings: {e}")

    matches = []
    countries = set()

    with open(csv_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Store original values for UID generation
            row["original_country_a"] = row["country_a"]
            row["original_country_b"] = row["country_b"]
            # Resolve actual names if mapped
            row["country_a"] = mappings.get(row["country_a"], row["country_a"])
            row["country_b"] = mappings.get(row["country_b"], row["country_b"])
            matches.append(row)
            # Collect unique actual countries (skip knockout placeholders like "Winner Match 74")
            for team in [row["country_a"], row["country_b"]]:
                if (
                    team
                    and not team.startswith("Winner")
                    and not team.startswith("Runner-up")
                    and not team.startswith("3rd")
                    and not team.startswith("Loser")
                ):
                    countries.add(team)

    # 1. Generate for all matches
    all_ics = generate_ics_content(matches, "All Matches")
    all_ics_path = os.path.join(output_dir, "all.ics")
    if content_changed(all_ics_path, all_ics):
        with open(all_ics_path, "w", encoding="utf-8", newline="\r\n") as f:
            f.write(all_ics)
        print("Generated all.ics with all matches.")
    else:
        print("all.ics has no changes. Skipped writing.")

    # Also save as worldcup_2026.ics in public directory
    global_ics_path = "public/worldcup_2026.ics"
    if content_changed(global_ics_path, all_ics):
        with open(global_ics_path, "w", encoding="utf-8", newline="\r\n") as f:
            f.write(all_ics)
        print("Generated public/worldcup_2026.ics.")
    else:
        print("worldcup_2026.ics has no changes. Skipped writing.")

    # 2. Generate for each country
    for country in sorted(countries):
        country_matches = [
            m for m in matches if m["country_a"] == country or m["country_b"] == country
        ]
        if country_matches:
            country_ics = generate_ics_content(country_matches, f"{country} Matches")
            filename = f"{clean_filename(country)}.ics"
            filepath = os.path.join(output_dir, filename)
            if content_changed(filepath, country_ics):
                with open(
                    filepath,
                    "w",
                    encoding="utf-8",
                    newline="\r\n",
                ) as f:
                    f.write(country_ics)
                print(f"Generated {filename} with {len(country_matches)} matches.")
            else:
                # Optional: print skip message to keep logs clear
                pass


if __name__ == "__main__":
    main()
