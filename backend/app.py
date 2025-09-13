from flask import Flask, request, jsonify
from flask_cors import CORS
from collections import defaultdict
import copy
import math
import random
import itertools


app = Flask(__name__)
CORS(app)


# ----------------- Data Structure Transformation -----------------

def transform_classes_to_sections(data):
    """
    Transform the new classes-based data structure to the old sections-based structure
    that the existing algorithms expect.
    """
    # Create a copy of the original data
    transformed_data = copy.deepcopy(data)
    
    # Extract sections from classes
    sections = []
    
    for class_info in data.get('classes', []):
        class_name = class_info.get('name', '')
        class_subjects = class_info.get('subjects', [])
        class_lab_subjects = class_info.get('lab_subjects', [])
        
        for section_info in class_info.get('sections', []):
            section_name = section_info.get('name', '')
            
            # Create full section name (e.g., "CSE 3rd Year - A")
            if section_name:
                full_section_name = f"{class_name} - {section_name}"
            else:
                full_section_name = class_name
            
            # Create section in the old format
            section_data = {
                'name': full_section_name,
                'student_count': section_info.get('student_count', 0),
                'subjects': class_subjects.copy(),
                'lab_subjects': class_lab_subjects.copy(),
                'class_name': class_name,  # Keep reference to parent class
                'section_name': section_name
            }
            
            sections.append(section_data)
    
    # Replace classes with sections in the transformed data
    transformed_data['sections'] = sections
    
    # Remove the classes key as it's no longer needed
    if 'classes' in transformed_data:
        del transformed_data['classes']
    
    return transformed_data

def validate_input_data(data):
    """
    Validate the input data structure and return validation results.
    """
    errors = []
    warnings = []
    
    # Check if classes exist
    if 'classes' not in data:
        errors.append('Missing required field: classes')
        return {'valid': False, 'errors': errors, 'warnings': warnings}
    
    classes = data.get('classes', [])
    if not classes:
        errors.append('At least one class is required')
        return {'valid': False, 'errors': errors, 'warnings': warnings}
    
    # Validate each class
    for i, class_info in enumerate(classes):
        if not isinstance(class_info, dict):
            errors.append(f'Class {i+1} must be an object')
            continue
            
        # Check required fields
        if not class_info.get('name'):
            errors.append(f'Class {i+1} must have a name')
        
        if 'sections' not in class_info or not class_info['sections']:
            errors.append(f'Class {i+1} must have at least one section')
        else:
            # Validate sections
            for j, section in enumerate(class_info['sections']):
                if not isinstance(section, dict):
                    errors.append(f'Class {i+1}, Section {j+1} must be an object')
                    continue
                
                if not section.get('name'):
                    warnings.append(f'Class {i+1}, Section {j+1} should have a name')
                
                if not section.get('student_count', 0):
                    warnings.append(f'Class {i+1}, Section {j+1} should have student count')
        
        # Check subjects
        subjects = class_info.get('subjects', [])
        lab_subjects = class_info.get('lab_subjects', [])
        
        if not subjects and not lab_subjects:
            warnings.append(f'Class {i+1} ({class_info.get("name", "")}) has no subjects defined')
    
    # Check other required fields
    required_fields = ['rooms', 'days', 'slots']
    for field in required_fields:
        if field not in data:
            errors.append(f'Missing required field: {field}')
    
    # Check days and slots
    if 'days' in data and len(data.get('days', [])) < 1:
        errors.append('At least one day must be defined')
    
    if 'slots' in data:
        non_lunch_slots = [s for s in data.get('slots', []) if s != 'Lunch Break']
        if len(non_lunch_slots) < 1:
            errors.append('At least one time slot must be defined')
    
    # Check teacher assignments
    all_subjects = set()
    for class_info in classes:
        all_subjects.update(class_info.get('subjects', []))
        all_subjects.update(class_info.get('lab_subjects', []))
    
    teachers = data.get('teachers', {})
    lab_teachers = data.get('lab_teachers', {})
    
    for subject in all_subjects:
        if subject not in teachers and subject not in lab_teachers:
            warnings.append(f'No teacher assigned to subject: {subject}')
        else:
            assigned_teachers = []
            if subject in teachers:
                assigned_teachers.extend([t for t in teachers[subject] if t.strip()])
            if subject in lab_teachers:
                assigned_teachers.extend([t for t in lab_teachers[subject] if t.strip()])
            
            if not assigned_teachers:
                warnings.append(f'Subject "{subject}" has no valid teachers assigned')
    
    # Check lab room assignments
    lab_rooms = data.get('lab_rooms', {})
    for class_info in classes:
        for lab_subject in class_info.get('lab_subjects', []):
            if lab_subject not in lab_rooms or not lab_rooms[lab_subject]:
                warnings.append(f'No lab rooms assigned to lab subject: {lab_subject}')
    
    return {
        'valid': len(errors) == 0,
        'errors': errors,
        'warnings': warnings
    }


# ----------------- Utilities -----------------


def assign_fixed_classrooms(data):
    rooms = data.get("rooms", [])
    fixed = {}
    for i, sec in enumerate(data["sections"]):
        if rooms:
            fixed[sec["name"]] = rooms[i % len(rooms)]
        else:
            fixed[sec["name"]] = None
    return fixed



def create_fixed_teacher_mapping(data):
    mapping = {}
    for sec in data["sections"]:
        secname = sec["name"]
        subjects = sec.get("subjects", []) + sec.get("lab_subjects", [])
        for sub in subjects:
            if sub in data.get("lab_teachers", {}):
                teachers = data["lab_teachers"][sub]
            else:
                val = data.get("teachers", {}).get(sub)
                if isinstance(val, list):
                    teachers = val[:]
                elif val:
                    teachers = [val]
                else:
                    teachers = [None]
            if not teachers:
                teachers = [None]
            idx = abs(hash((secname, sub))) % len(teachers)
            mapping[(secname, sub)] = teachers[idx]
    return mapping



def get_lab_groups_map(data):
    cap = data.get("lab_capacity", 30)
    groups = {}
    for s in data["sections"]:
        students = int(s.get("student_count", 0))
        groups[s["name"]] = max(1, math.ceil(students / cap))
    return groups



def make_group_labels(num_groups):
    return [f"A{i+1}" for i in range(num_groups)]



def make_empty_timetable(data):
    timetable = {}
    for sec in data["sections"]:
        name = sec["name"]
        timetable[name] = {}
        for day in data["days"]:
            timetable[name][day] = {}
            for slot in data["slots"]:
                if slot == "Lunch Break":
                    timetable[name][day][slot] = [("LUNCH", None, None)]
                else:
                    timetable[name][day][slot] = []
    return timetable



# ----------------- Scheduler Core -----------------


def slot_pairs_order(data):
    slots = data["slots"]
    pairs = []
    idx_map = {s: i for i, s in enumerate(slots)}
    pref_pairs = []
    if "2:00-2:55" in idx_map and "2:55-3:50" in idx_map:
        pref_pairs.append((idx_map["2:00-2:55"], idx_map["2:55-3:50"]))
    if "2:55-3:50" in idx_map and "3:50-4:45" in idx_map:
        pref_pairs.append((idx_map["2:55-3:50"], idx_map["3:50-4:45"]))


    for i in range(len(slots) - 1):
        if slots[i] == "Lunch Break" or slots[i + 1] == "Lunch Break":
            continue
        pairs.append((i, i + 1))


    ordered = []
    for p in pref_pairs:
        if p in pairs and p not in ordered:
            ordered.append(p)
    for p in pairs:
        if p not in ordered:
            ordered.append(p)


    slot_names = data["slots"]
    return [(slot_names[a], slot_names[b]) for a, b in ordered]



def teacher_unavailable_on(teacher, day, slot, data):
    if not teacher:
        return False
    unavail = data.get("teacher_unavailability", {})
    if teacher not in unavail:
        return False
    for u in unavail[teacher]:
        if u.get("day") == day and u.get("slot") == slot:
            return True
    return False



def can_place_block(timetable, secname, day, pair, room, teacher, used_rooms, used_teachers, data):
    for slot in pair:
        existing = timetable[secname][day][slot]
        if any(entry and entry[0] not in ("FREE",) for entry in existing):
            return False
        if room and (room, day, slot) in used_rooms:
            return False
        if teacher and (teacher, day, slot) in used_teachers:
            return False
        if teacher_unavailable_on(teacher, day, slot, data):
            return False
    return True



def assign_all_labs(data, timetable, fixed_teachers, fixed_classrooms):
    slot_pairs = slot_pairs_order(data)
    days = data["days"]
    lab_rooms_map = data.get("lab_rooms", {})
    lab_groups_map = get_lab_groups_map(data)


    tasks = []
    for sec in data["sections"]:
        secname = sec["name"]
        num_groups = lab_groups_map[secname]
        group_labels = make_group_labels(num_groups)
        # each group for each lab subject needs a session
        for gi, gl in enumerate(group_labels):
            for lab in sec.get("lab_subjects", []):
                tasks.append({
                    "section": secname,
                    "lab": lab,
                    "group_index": gi,
                    "group_label": gl,
                    "assigned": False
                })


    used_rooms = set()
    used_teachers = set()


    # primary pass: try combos per section/day/pair
    for pair in slot_pairs:
        if all(t["assigned"] for t in tasks):
            break
        for day in days:
            if all(t["assigned"] for t in tasks):
                break
            for sec in data["sections"]:
                secname = sec["name"]
                pending = [t for t in tasks if (not t["assigned"]) and t["section"] == secname]
                if not pending:
                    continue
                parallel_cap = min(lab_groups_map[secname], 3)
                assigned_in_this_pair = False
                for k in range(parallel_cap, 0, -1):
                    for combo in itertools.combinations(pending, k):
                        group_idxs = {c["group_index"] for c in combo}
                        labs_set = {c["lab"] for c in combo}
                        if len(group_idxs) != k or len(labs_set) != k:
                            continue
                        ok = True
                        temp_rooms = set()
                        temp_teachers = set()
                        for c in combo:
                            gi = c["group_index"]
                            lab = c["lab"]
                            available_rooms = lab_rooms_map.get(lab, [])
                            if not available_rooms:
                                available_rooms = data.get("labs", []) or [fixed_classrooms.get(secname)]
                            room = available_rooms[gi % len(available_rooms)] if available_rooms else None
                            teacher = fixed_teachers.get((secname, lab))
                            for slot in pair:
                                if any(entry and entry[0] not in ("FREE",) for entry in timetable[secname][day][slot]):
                                    ok = False
                                    break
                                if room and (room, day, slot) in used_rooms:
                                    ok = False
                                    break
                                if teacher and (teacher, day, slot) in used_teachers:
                                    ok = False
                                    break
                                if room and (room, day, slot) in temp_rooms:
                                    ok = False
                                    break
                                if teacher and (teacher, day, slot) in temp_teachers:
                                    ok = False
                                    break
                                if teacher_unavailable_on(teacher, day, slot, data):
                                    ok = False
                                    break
                            if not ok:
                                break
                            for slot in pair:
                                if room:
                                    temp_rooms.add((room, day, slot))
                                if teacher:
                                    temp_teachers.add((teacher, day, slot))
                        if not ok:
                            continue
                        # commit combo
                        for c in combo:
                            gi = c["group_index"]
                            lab = c["lab"]
                            available_rooms = lab_rooms_map.get(lab, [])
                            if not available_rooms:
                                available_rooms = data.get("labs", []) or [fixed_classrooms.get(secname)]
                            room = available_rooms[gi % len(available_rooms)] if available_rooms else None
                            teacher = fixed_teachers.get((secname, lab))
                            label = c["group_label"]
                            for slot in pair:
                                timetable[secname][day][slot].append((lab, room, teacher, label))
                                if room:
                                    used_rooms.add((room, day, slot))
                                if teacher:
                                    used_teachers.add((teacher, day, slot))
                            c["assigned"] = True
                        assigned_in_this_pair = True
                        break
                    if assigned_in_this_pair:
                        break


    # secondary pass: one-by-one
    for tsk in tasks:
        if tsk["assigned"]:
            continue
        secname = tsk["section"]
        lab = tsk["lab"]
        gi = tsk["group_index"]
        available_rooms = lab_rooms_map.get(lab, [])
        if not available_rooms:
            available_rooms = data.get("labs", []) or [fixed_classrooms.get(secname)]
        room = available_rooms[gi % len(available_rooms)] if available_rooms else None
        teacher = fixed_teachers.get((secname, lab))
        placed = False
        for pair in slot_pairs:
            for day in days:
                if can_place_block(timetable, secname, day, pair, room, teacher, used_rooms, used_teachers, data):
                    label = tsk["group_label"]
                    for slot in pair:
                        timetable[secname][day][slot].append((lab, room, teacher, label))
                        if room:
                            used_rooms.add((room, day, slot))
                        if teacher:
                            used_teachers.add((teacher, day, slot))
                    tsk["assigned"] = True
                    placed = True
                    break
            if placed:
                break
        if not tsk["assigned"]:
            # last resort: ignore teacher conflicts
            for pair in slot_pairs:
                for day in days:
                    ok = True
                    for slot in pair:
                        if any(entry and entry[0] not in ("FREE",) for entry in timetable[secname][day][slot]):
                            ok = False
                            break
                        if room and (room, day, slot) in used_rooms:
                            ok = False
                            break
                    if ok:
                        label = tsk["group_label"]
                        for slot in pair:
                            timetable[secname][day][slot].append((lab, room, None, label))
                            if room:
                                used_rooms.add((room, day, slot))
                        tsk["assigned"] = True
                        ok = True
                        break
                if tsk["assigned"]:
                    break
        if not tsk["assigned"]:
            last_day = days[0]
            last_slot = data["slots"][-1]
            timetable[secname][last_day][last_slot].append((f"{lab}-UNSCHED", None, None, tsk["group_label"]))
            tsk["assigned"] = True


    return timetable



def assign_theory_subjects(data, timetable, fixed_teachers, fixed_classrooms):
    days = data["days"]
    slots = [s for s in data["slots"] if s != "Lunch Break"]
    slot_index = {s: i for i, s in enumerate(slots)}
    constraints = data.get("constraints", {})
    max_subj_per_day = constraints.get("max_lectures_per_subject_per_day", 2)
    max_daily = constraints.get("max_lectures_per_day_section", 6)
    lecture_req = data.get("lecture_requirements", {})


    used_rooms = set()
    used_teachers = set()
    for sec in timetable:
        for day in days:
            for slot in data["slots"]:
                for entry in timetable[sec][day][slot]:
                    if entry[0] in ("FREE", "LUNCH", "Workshop"):
                        continue
                    subj = entry[0]
                    room = entry[1]
                    teacher = entry[2]
                    if room:
                        used_rooms.add((room, day, slot))
                    if teacher:
                        used_teachers.add((teacher, day, slot))


    remaining = {}
    for sec in data["sections"]:
        secname = sec["name"]
        remaining[secname] = {}
        for sub in sec.get("subjects", []):
            remaining[secname][sub] = lecture_req.get(sub, 3)


    daily_subj_count = {sec["name"]: {d: defaultdict(int) for d in days} for sec in data["sections"]}
    daily_total = {sec["name"]: {d: 0 for d in days} for sec in data["sections"]}


    for sec in data["sections"]:
        secname = sec["name"]
        subjects = sec.get("subjects", [])
        subjects.sort(key=lambda s: -remaining[secname].get(s, 0))
        for sub in subjects:
            req = remaining[secname][sub]
            if req <= 0:
                continue
            teacher = fixed_teachers.get((secname, sub))
            fixed_room = fixed_classrooms.get(secname)
            attempts = 0
            while req > 0 and attempts < len(days) * len(slots) * 3:
                candidate_days = sorted(days, key=lambda d: daily_total[secname][d])
                placed = False
                for day in candidate_days:
                    if daily_subj_count[secname][day][sub] >= max_subj_per_day:
                        continue
                    if daily_total[secname][day] >= max_daily:
                        continue
                    for slot in slots:
                        if any(e and e[0] not in ("FREE",) and (len(e) > 3) for e in timetable[secname][day][slot]):
                            continue
                        if any(e and e[0] not in ("FREE",) and (len(e) <= 3 and e[0] != sub) for e in timetable[secname][day][slot]):
                            continue
                        if teacher and teacher_unavailable_on(teacher, day, slot, data):
                            continue
                        prev_idx = slot_index[slot] - 1
                        if prev_idx >= 0:
                            prev_slot = slots[prev_idx]
                            prev_entries = timetable[secname][day][prev_slot]
                            if any(e[0] == sub for e in prev_entries):
                                continue
                        if fixed_room and (fixed_room, day, slot) in used_rooms:
                            continue
                        if teacher and (teacher, day, slot) in used_teachers:
                            continue
                        timetable[secname][day][slot].append((sub, fixed_room, teacher))
                        used_rooms.add((fixed_room, day, slot))
                        if teacher:
                            used_teachers.add((teacher, day, slot))
                        remaining[secname][sub] -= 1
                        req -= 1
                        daily_subj_count[secname][day][sub] += 1
                        daily_total[secname][day] += 1
                        placed = True
                        break
                    if placed:
                        break
                if not placed:
                    # local swap/backtrack
                    swap_done = try_easy_swap_for_subject(timetable, secname, sub, remaining, fixed_teachers,
                                                         fixed_classrooms, used_rooms, used_teachers, data,
                                                         daily_subj_count, daily_total)
                    if swap_done:
                        remaining[secname][sub] -= 1
                        req -= 1
                        continue
                    break
                attempts += 1


    for sec in data["sections"]:
        secname = sec["name"]
        for day in days:
            for slot in data["slots"]:
                if slot == "Lunch Break":
                    continue
                if not timetable[secname][day][slot]:
                    timetable[secname][day][slot] = [("FREE", None, None)]


    unfulfilled = {}
    for secname, subs in remaining.items():
        for sub, cnt in subs.items():
            if cnt > 0:
                unfulfilled.setdefault(secname, {})[sub] = cnt
    return timetable, unfulfilled



def try_easy_swap_for_subject(timetable, secname, sub, remaining, fixed_teachers, fixed_classrooms, used_rooms, used_teachers, data, daily_subj_count, daily_total):
    days = data["days"]
    slots = [s for s in data["slots"] if s != "Lunch Break"]
    for day in days:
        for slot in slots:
            entries = timetable[secname][day][slot]
            if not entries:
                continue
            for entry in entries:
                subj = entry[0]
                if subj in ("FREE", "LUNCH"):
                    continue
                if len(entry) > 3:
                    continue
                occ_count = sum(1 for s in slots for e in timetable[secname][day][s] if any(ee[0] == subj for ee in ([e] if isinstance(e, tuple) else e)))
                if occ_count <= 1:
                    continue
                for target_day in days:
                    for target_slot in slots:
                        if target_day == day and target_slot == slot:
                            continue
                        if any(e and e[0] not in ("FREE",) for e in timetable[secname][target_day][target_slot]):
                            continue
                        timetable[secname][day][slot] = [e for e in timetable[secname][day][slot] if e != entry]
                        if not timetable[secname][day][slot]:
                            timetable[secname][day][slot] = [("FREE", None, None)]
                        timetable[secname][target_day][target_slot].append(entry)
                        return True
    return False



# ----------------- Suggestion Generator -----------------


def generate_suggestions(data, timetable, unfulfilled, fixed_teachers):
    """
    For each unfulfilled (section, subject, count) produce suggestions:
      - If too few teachers or teacher-availability insufficient -> suggest more faculty or reassign.
      - If not enough free slots -> suggest increase slots/relax constraints.
      - Else suggest relaxing per-day limits or swapping labs/rooms.
    """
    days = data["days"]
    slots = [s for s in data["slots"] if s != "Lunch Break"]


    # compute used_teachers from final timetable
    used_teachers = set()
    for sec in timetable:
        for d in data["days"]:
            for s in data["slots"]:
                for entry in timetable[sec][d][s]:
                    if not entry:
                        continue
                    subj = entry[0]
                    teach = entry[2]
                    if subj in ("FREE", "LUNCH"):
                        continue
                    if teach:
                        used_teachers.add((teach, d, s))


    suggestions = {}


    for secname, subs in unfulfilled.items():
        suggestions.setdefault(secname, {})
        # count free slots for this section across the week
        free_slots = 0
        free_slot_list = []
        for d in days:
            for s in slots:
                entries = timetable[secname][d][s]
                if all(e[0] in ("FREE",) for e in entries):
                    free_slots += 1
                    free_slot_list.append((d, s))


        for sub, cnt in subs.items():
            msgs = []
            # how many teachers exist for this subject in department data
            teachers_for_sub = data.get("teachers", {}).get(sub, [])
            # if empty, check lab_teachers (rare for theory, but just in case)
            if not teachers_for_sub:
                teachers_for_sub = data.get("lab_teachers", {}).get(sub, [])


            teacher_count = len(teachers_for_sub)
            # measure per-teacher availability (counts of free slots for that teacher)
            teacher_avail = {}
            for t in teachers_for_sub:
                avail = 0
                for d in days:
                    for s in slots:
                        if (t, d, s) in used_teachers:
                            continue
                        if teacher_unavailable_on(t, d, s, data):
                            continue
                        avail += 1
                teacher_avail[t] = avail
            max_teacher_avail = max(teacher_avail.values()) if teacher_avail else 0


            msgs.append(f"Unfulfilled: need {cnt} lecture(s) of **{sub}** for **{secname}**.")


            if teacher_count == 0:
                msgs.append(f"- No teacher is assigned for subject **{sub}** in input. Suggest hiring/assigning at least {cnt} qualified faculty (or allow cross-teaching).")
            else:
                # If combined teacher availability insufficient
                total_possible_by_current_staff = sum(teacher_avail.values())
                if total_possible_by_current_staff < cnt:
                    more_needed = cnt - total_possible_by_current_staff
                    msgs.append(f"- Current faculty for **{sub}**: {teacher_count}. Their total available free slots ≈ {total_possible_by_current_staff}. Suggest assigning/hiring at least **{more_needed}** additional faculty or reassigning other teachers.")
                else:
                    # if there are free slots but subject couldn't be placed due to constraints
                    if free_slots >= cnt:
                        msgs.append(f"- There are {free_slots} free slot(s) available for {secname}. The issue likely stems from daily/session constraints (e.g., `max_lectures_per_subject_per_day` or `max_lectures_per_day_section`) or teacher-room conflicts. Consider relaxing `max_lectures_per_subject_per_day` or `max_lectures_per_day_section`, or enabling limited swaps.")
                    else:
                        # not enough free slots
                        msgs.append(f"- Only {free_slots} free non-lunch slot(s) available for {secname}, which is less than the required {cnt}. Suggest: add more teaching slots (extend day / add Saturday), reduce lab distribution, or create additional parallel rooms so some theory slots can move into lab-time windows.")


            # room/lab related hints
            if sub + " LAB" in data.get("lab_rooms", {}):
                # subject appears to have an associated lab name — suggest increase lab rooms
                msgs.append(f"- Lab rooms for this subject are limited. Consider adding another lab room or freeing some lab time slots.")


            # generic suggestions
            msgs.append("- Other options: reduce group sizes (if lectures are duplicated), allow loading some lectures as remote/self-study, or manually move less-critical lectures to another week.")


            suggestions[secname][sub] = msgs


    return suggestions



# ----------------- API Helpers -----------------


def timetable_to_result(timetable, data, moved_map=None):
    """Return rows and include moved metadata if available."""
    result = []
    for secname, schedule in timetable.items():
        for day in data["days"]:
            for slot in data["slots"]:
                for entry in schedule[day][slot]:
                    if not entry:
                        continue
                    subj = entry[0]
                    if subj in ("FREE", "LUNCH"):
                        continue
                    room = entry[1]
                    teacher = entry[2]
                    row = {
                        "section": secname,
                        "day": day,
                        "slot": slot,
                        "subject": subj,
                        "room": room,
                        "teacher": teacher
                    }
                    # group for lab entries
                    if len(entry) > 3:
                        row["group"] = entry[3]
                    if moved_map and (secname, day, slot) in moved_map:
                        row["moved_from"] = moved_map[(secname, day, slot)]
                        row["moved"] = True
                    result.append(row)
    return result



# ----------------- Endpoints -----------------


@app.route('/generate_timetable', methods=['POST'])
def generate_timetable_api():
    try:
        request_data = request.json
        if not request_data:
            return jsonify({"error": "No input data"}), 400

        # Validate input data structure
        validation_result = validate_input_data(request_data)
        if not validation_result['valid']:
            return jsonify({
                "error": "Invalid input data",
                "validation_errors": validation_result['errors'],
                "validation_warnings": validation_result['warnings']
            }), 400

        # Transform classes-based structure to sections-based structure
        data = transform_classes_to_sections(request_data)

        print(f"Processing {len(data['sections'])} sections from {len(request_data.get('classes', []))} classes")

        fixed_classrooms = assign_fixed_classrooms(data)
        fixed_teachers = create_fixed_teacher_mapping(data)
        timetable = make_empty_timetable(data)

        # Assign labs first
        timetable = assign_all_labs(data, timetable, fixed_teachers, fixed_classrooms)
        # Assign theory
        timetable, unfulfilled = assign_theory_subjects(data, timetable, fixed_teachers, fixed_classrooms)

        # If some unfulfilled, do a relaxed re-try (existing logic)
        if unfulfilled:
            for sec in timetable:
                for day in data["days"]:
                    for slot in data["slots"]:
                        if slot == "Lunch Break":
                            continue
                        new_entries = []
                        for entry in timetable[sec][day][slot]:
                            if len(entry) > 3:
                                new_entries.append(entry)
                        timetable[sec][day][slot] = new_entries
            data_relaxed = copy.deepcopy(data)
            if "constraints" not in data_relaxed:
                data_relaxed["constraints"] = {}
            data_relaxed["constraints"]["max_lectures_per_subject_per_day"] = data_relaxed["constraints"].get("max_lectures_per_subject_per_day", 2) + 1
            timetable, unfulfilled2 = assign_theory_subjects(data_relaxed, timetable, fixed_teachers, fixed_classrooms)
            unfulfilled = unfulfilled2

        # Generate suggestions if any unfulfilled remain
        suggestions = {}
        if unfulfilled:
            suggestions = generate_suggestions(data, timetable, unfulfilled, fixed_teachers)

        # Calculate statistics
        stats = calculate_timetable_stats(timetable, request_data)

        result = timetable_to_result(timetable, data)
        
        return jsonify({
            "success": True,
            "timetable": result, 
            "unfulfilled": unfulfilled, 
            "suggestions": suggestions,
            "statistics": stats,
            "validation_warnings": validation_result.get('warnings', [])
        })

    except Exception as e:
        print(f"Error generating timetable: {str(e)}")
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500


def calculate_timetable_stats(timetable, original_data):
    """Calculate statistics for the generated timetable"""
    stats = {
        'total_sections': len(timetable),
        'total_classes': len(original_data.get('classes', [])),
        'total_slots_used': 0,
        'total_slots_available': 0,
        'teacher_utilization': {},
        'room_utilization': {},
        'subject_distribution': {}
    }
    
    # Calculate total slots
    days = original_data.get('days', [])
    slots = [s for s in original_data.get('slots', []) if s != 'Lunch Break']
    total_slots_per_section = len(days) * len(slots)
    stats['total_slots_available'] = total_slots_per_section * len(timetable)
    
    # Count used slots and gather statistics
    teacher_hours = defaultdict(int)
    room_hours = defaultdict(int)
    subject_count = defaultdict(int)
    
    for section_name, section_schedule in timetable.items():
        for day, day_schedule in section_schedule.items():
            for slot, entries in day_schedule.items():
                if slot == 'Lunch Break':
                    continue
                    
                for entry in entries:
                    if not entry or entry[0] in ('FREE', 'LUNCH'):
                        continue
                        
                    stats['total_slots_used'] += 1
                    
                    if len(entry) > 1 and entry[1]:  # teacher
                        teacher_hours[entry[1]] += 1
                    
                    if len(entry) > 2 and entry[2]:  # room  
                        room_hours[entry[2]] += 1
                    
                    if entry[0]:  # subject
                        subject_count[entry[0]] += 1
    
    # Calculate utilization percentages
    stats['utilization_percentage'] = (stats['total_slots_used'] / stats['total_slots_available'] * 100) if stats['total_slots_available'] > 0 else 0
    stats['teacher_utilization'] = dict(teacher_hours)
    stats['room_utilization'] = dict(room_hours)
    stats['subject_distribution'] = dict(subject_count)
    
    return stats


@app.route('/validate_input', methods=['POST'])
def validate_input_api():
    """Validate the input data structure"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        validation_result = validate_input_data(data)
        return jsonify(validation_result)
        
    except Exception as e:
        return jsonify({
            'valid': False,
            'errors': [f'Validation error: {str(e)}'],
            'warnings': []
        }), 500


@app.route('/reset_teacher', methods=['POST'])
def reset_teacher_api():
    try:
        request_data = request.json
        teacher = request_data.get('teacher')
        day = request_data.get('day')
        slot = request_data.get('slot')
        original_input_data = request_data.get('inputData')  # Original classes-based data
        current_list = request_data.get('timetable', [])

        if not original_input_data:
            return jsonify({"error": "inputData missing"}), 400

        # Transform to sections-based structure
        data = transform_classes_to_sections(original_input_data)

        timetable = make_empty_timetable(data)
        for entry in current_list:
            sec = entry["section"]
            d = entry["day"]
            s = entry["slot"]
            subj = entry["subject"]
            room = entry.get("room")
            teach = entry.get("teacher")
            group = entry.get("group")
            if group:
                timetable[sec][d][s].append((subj, room, teach, group))
            else:
                timetable[sec][d][s].append((subj, room, teach))

        freed_sections = []
        if teacher and day and slot:
            for sec in timetable:
                entries = timetable[sec][day][slot]
                new_entries = [e for e in entries if len(e) < 3 or e[2] != teacher]
                if len(new_entries) != len(entries):
                    if not new_entries:
                        timetable[sec][day][slot] = [("FREE", None, None)]
                        freed_sections.append(sec)
                    else:
                        timetable[sec][day][slot] = new_entries

        # reconstruct occupancy sets
        used_rooms = set()
        used_teachers = set()
        for sec in timetable:
            for d in data["days"]:
                for s in data["slots"]:
                    for entry in timetable[sec][d][s]:
                        if not entry:
                            continue
                        subj = entry[0]
                        room = entry[1]
                        teach = entry[2]
                        if subj in ("FREE", "LUNCH"):
                            continue
                        if room:
                            used_rooms.add((room, d, s))
                        if teach:
                            used_teachers.add((teach, d, s))

        slots_all = data["slots"]
        if "Lunch Break" in slots_all:
            lunch_idx = slots_all.index("Lunch Break")
            rightmost_before_lunch = slots_all[lunch_idx - 1] if lunch_idx - 1 >= 0 else None
            rightmost_after_lunch = slots_all[-1] if len(slots_all) > lunch_idx + 1 else None
        else:
            rightmost_before_lunch = slots_all[-2] if len(slots_all) >= 2 else slots_all[0]
            rightmost_after_lunch = slots_all[-1]

        fixed_classrooms = assign_fixed_classrooms(data)
        fixed_teachers = create_fixed_teacher_mapping(data)

        moved_map = {}  # (section, day, new_slot) -> old_slot

        # For each freed section attempt the swaps:
        for sec in freed_sections:
            try:
                if not timetable[sec][day][slot] or (len(timetable[sec][day][slot]) == 1 and timetable[sec][day][slot][0][0] == "FREE"):
                    moved = False
                    # Determine freed slot index
                    freed_index = slots_all.index(slot)

                    # candidates first: rightmost before lunch, rightmost after lunch
                    candidate_slots = []

                    # Add rightmost-before-lunch only if it is later than freed slot
                    if rightmost_before_lunch:
                        idx_rbl = slots_all.index(rightmost_before_lunch)
                        if idx_rbl > freed_index:
                            candidate_slots.append(rightmost_before_lunch)

                    # Add rightmost-after-lunch only if it is later than freed slot
                    if rightmost_after_lunch:
                        idx_ral = slots_all.index(rightmost_after_lunch)
                        if idx_ral > freed_index:
                            candidate_slots.append(rightmost_after_lunch)

                    # then other later slots in the day ordered rightmost-first (only slots with index > freed_index)
                    later_slots = [s for i, s in enumerate(slots_all) if i > freed_index and s != "Lunch Break"]
                    # prefer rightmost-first
                    later_slots_sorted = sorted(later_slots, key=lambda s: slots_all.index(s), reverse=True)
                    for s2 in later_slots_sorted:
                        if s2 not in candidate_slots:
                            candidate_slots.append(s2)

                    for target_slot in candidate_slots:
                        # find a movable theory entry at target_slot (non lab)
                        entries = list(timetable[sec][day][target_slot])
                        candidate_entry = None
                        for e in entries:
                            if not e:
                                continue
                            subj = e[0]
                            if subj in ("FREE", "LUNCH"):
                                continue
                            # skip lab group entries (len>3)
                            if len(e) > 3:
                                continue
                            # select first theory entry
                            candidate_entry = e
                            break

                        if not candidate_entry:
                            continue

                        subj = candidate_entry[0]
                        room = candidate_entry[1]
                        teach = candidate_entry[2]

                        # teacher must be available at freed slot and not used
                        if teach and teacher_unavailable_on(teach, day, slot, data):
                            continue
                        if teach and (teach, day, slot) in used_teachers:
                            continue
                        # room must not be used at freed slot
                        check_room = room  # preserve original room
                        if check_room and (check_room, day, slot) in used_rooms:
                            continue

                        # all checks passed -> move
                        # remove candidate_entry from target_slot
                        timetable[sec][day][target_slot] = [x for x in timetable[sec][day][target_slot] if x != candidate_entry]
                        if not timetable[sec][day][target_slot]:
                            timetable[sec][day][target_slot] = [("FREE", None, None)]

                        # insert exact entry into freed slot (preserve room & teacher)
                        timetable[sec][day][slot] = [(subj, room, teach)]
                        # update occupancy sets
                        if room:
                            used_rooms.discard((room, day, target_slot))
                            used_rooms.add((room, day, slot))
                        if teach:
                            used_teachers.discard((teach, day, target_slot))
                            used_teachers.add((teach, day, slot))

                        moved_map[(sec, day, slot)] = target_slot
                        moved = True
                        break

                    if not moved:
                        # fallback: put a Workshop
                        timetable[sec][day][slot] = [("Workshop", None, None)]
            except Exception:
                pass

        result = timetable_to_result(timetable, data, moved_map=moved_map)
        return jsonify({"timetable": result})

    except Exception as e:
        print(f"Error in reset_teacher: {str(e)}")
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'Timetable Generator API is running',
        'version': '2.0',
        'supports': 'classes-based input structure'
    })


if __name__ == "__main__":
    print("Starting Enhanced Timetable Generator API...")
    print("Supports new classes-based input structure")
    print("Available endpoints:")
    print("  POST /generate_timetable - Generate a timetable")
    print("  POST /validate_input - Validate input data")
    print("  POST /reset_teacher - Reset teacher assignment")
    print("  GET  /health - Health check")
    
    random.seed(42)
    app.run(debug=True, host='0.0.0.0', port=5000)
