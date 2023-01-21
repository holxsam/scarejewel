"use client";

import { Combobox, Disclosure, Menu, Popover } from "@headlessui/react";
import {
  IconCheck,
  IconChevronDown,
  IconCircleChevronDown,
  IconDotsVertical,
  IconPalette,
  IconSquareRoundedChevronDown,
  IconTrash,
  IconX,
} from "@tabler/icons";
import { useQuery } from "@tanstack/react-query";
import { PrimitiveAtom, useAtom, useSetAtom } from "jotai";
import {
  Fragment,
  memo,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { CourseItem, courseItemsAtom } from "../../state/course-cart";

import { Semester } from "../../database/types";
import { PrettyColor } from "../../utils/colors";
import { formatTitle } from "../../utils/util";
import { SectionSelector } from "../SectionSelector/SectionSelector";
import {
  placeholder_text_color,
  text_color,
  ring_color,
  bg_color_base,
  bg_color_highlight,
  text_color_active,
  bg_color_hover,
  glow,
} from "./CourseSelector.variants";
import { fetchDistinctCourseIds, fetchDistinctDepts } from "../../database/api";
import clsx from "clsx";
import { PrettyColorPicker } from "../PrettyColorPicker/PrettyColorPicker";

const staleTime = 60 * 60 * 1000;

export interface ComboOption {
  id: string;
  label: string;
  value: string;
  title: string;
}

export type CourseSelectorProps = {
  semester: Semester;
  year: number;
  courseItemAtom: PrimitiveAtom<CourseItem>;
  index: number;
};

export const CourseSelector = memo(function CourseSelector({
  semester,
  year,
  courseItemAtom,
  index,
}: CourseSelectorProps) {
  const [courseItem, setCourseItem] = useAtom(courseItemAtom);

  const { data: distinctDepts } = useQuery({
    queryKey: ["fetchDistinctDepts", semester, year],
    queryFn: () => fetchDistinctDepts(semester, year),
    staleTime,
  });

  const { data: distinctCourseIds } = useQuery({
    queryKey: [
      "fetchDistinctCourseIds",
      semester,
      year,
      courseItem.selectedDept.value,
    ],
    queryFn: () =>
      fetchDistinctCourseIds(semester, year, courseItem.selectedDept.value),
    enabled: courseItem.selectedDept.id !== "",
    staleTime,
  });

  const deptOptions: ComboOption[] = useMemo(
    () =>
      (distinctDepts ?? []).map((v) => ({
        id: v.uid,
        label: v.dept_abbr,
        value: v.dept_abbr,
        title: v.dept_title,
      })),
    [distinctDepts]
  );

  const courseOptions: ComboOption[] = useMemo(
    () =>
      (distinctCourseIds ?? []).map((v) => ({
        id: v.uid,
        label: v.course_number,
        value: v.course_number,
        title: v.course_title,
      })),
    [distinctCourseIds]
  );

  const updateSelectedDept = (updateItem: ComboOption) => {
    const oldId = courseItem.selectedDept.id;
    const newId = updateItem.id;
    if (oldId === newId) return;

    setCourseItem({
      ...courseItem,
      selectedDept: updateItem,
      selectedCourse: {
        id: "",
        value: "",
        label: "",
        title: "",
      },
      availableSections: [],
    });
  };

  const updateSelectedCourse = (updateItem: ComboOption) => {
    const oldId = courseItem.selectedCourse.id;
    const newId = updateItem.id;
    if (oldId === newId) return;

    setCourseItem({
      ...courseItem,
      selectedCourse: updateItem,
      availableSections: [],
    });
  };

  const title = formatTitle(courseItem.selectedCourse.title);
  const disableCourseSelect = !courseItem.selectedDept.value;

  const { color } = courseItem;

  // style tokens:
  const bgc = bg_color_base[color];
  const textColor = text_color[color];
  const activeTextColor = text_color_active[color];
  const ringColor = ring_color[color];

  // repeated styles:
  const ringStyle = `${ringColor} ring-0 focus-visible:ring-2 ring-inset appearance-none outline-none`;

  return (
    <Disclosure
      defaultOpen
      as="li"
      className="relative flex flex-col gap-8"
      style={{ zIndex: 20 - index }}
    >
      {({ open }) => (
        <>
          <div
            className={clsx(
              "sticky z-10 top-[calc(4rem)] flex gap-0 w-full rounded-lg p-2 text-sm font-medium",
              textColor,
              bgc
            )}
          >
            <Disclosure.Button
              className={clsx(
                "grid place-items-center rounded-md pl-1zz pr-2zz px-1 mr-1",
                ringStyle,
                activeTextColor
              )}
            >
              <IconCircleChevronDown
                stroke={1.75}
                className={clsx(
                  "transition-[transform]",
                  open ? "rotate-180" : "rotate-0"
                )}
              />
            </Disclosure.Button>
            <AutoCompleteInput
              options={deptOptions}
              selectedOption={courseItem.selectedDept}
              onChange={updateSelectedDept}
              placeholder="Dept"
              color={color}
            />
            <AutoCompleteInput
              options={courseOptions}
              selectedOption={courseItem.selectedCourse}
              onChange={updateSelectedCourse}
              placeholder="Code"
              color={color}
              disabled={disableCourseSelect}
            />
            <Disclosure.Button
              className={clsx(
                "overflow-hidden flex items-center flex-grow flex-shrink pl-3 pr-1 rounded-md font-semibold text-sm whitespace-nowrap",
                ringStyle
              )}
            >
              {title || "Pick a department THEN a course code"}
            </Disclosure.Button>

            <ActionDropdown
              courseItemAtom={courseItemAtom}
              buttonStyle={ringStyle}
            />
          </div>

          <Disclosure.Panel className="relative z-0 px-2">
            <SectionSelector
              semester={semester}
              year={year}
              courseItemAtom={courseItemAtom}
            />
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
},
arePropsEqual);

const ActionDropdown = ({
  buttonStyle = "",
  courseItemAtom,
}: {
  courseItemAtom: PrimitiveAtom<CourseItem>;
  buttonStyle?: string;
}) => {
  const [courseItem, setCourseItem] = useAtom(courseItemAtom);
  const setCourseItems = useSetAtom(courseItemsAtom);

  const { color } = courseItem;

  const bgColorHighlight = bg_color_hover[color];

  const removeSelf = () =>
    setCourseItems((list) => {
      const idx = list.findIndex((item) => item.id === courseItem.id);
      if (idx === -1) return list;
      return [...list.slice(0, idx), ...list.slice(idx + 1)];
    });

  const setColor = (color: PrettyColor) =>
    setCourseItem((v) => ({ ...v, color }));

  return (
    <Popover as="div" className="relative flex flex-col">
      <Popover.Button
        className={clsx(
          "grid place-items-center h-full w-full rounded-md ",
          buttonStyle,
          bgColorHighlight
        )}
      >
        <IconDotsVertical />
      </Popover.Button>

      {/* this extra div allows us to anchor the Menu.Items container to the bottom of Menu.Button*/}
      <div className="relative">
        <Popover.Panel
          className={clsx(
            "absolute right-0 top-0 flex flex-col gap-4 p-4 mt-4 text-slate-900",
            "rounded-lg bg-white borderzz border-slate-200zz drop-shadow-mdzz shadow-lg ring-1 ring-black ring-opacity-5"
          )}
        >
          {({ close }) => (
            <>
              <PrettyColorPicker selectedColor={color} onChange={setColor} />
              <button
                type="button"
                onClick={() => {
                  close();
                  removeSelf();
                }}
                className={clsx(
                  "flex justify-center items-center gap-2 px-4 py-2 rounded-lg bg-rose-50 text-rose-500 font-semibold",
                  "hover:bg-rose-100 hover:text-rose-600"
                )}
              >
                <IconTrash />
                <span className="whitespace-nowrap">Remove Course</span>
              </button>
            </>
          )}
        </Popover.Panel>
      </div>
    </Popover>
  );
};

const fuzzy = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, "");
const fuzzyCompare = (searchTerm: string, comparedTerm: string) =>
  fuzzy(comparedTerm).includes(fuzzy(searchTerm));

interface ComboerProps {
  options: ComboOption[];
  selectedOption: ComboOption;
  onChange: (opt: ComboOption) => void;
  disabled?: boolean;
  placeholder?: string;
  color?: PrettyColor;
}

export const AutoCompleteInput = ({
  options,
  selectedOption,
  onChange,
  disabled = false,
  placeholder = "",
  color = "sky",
}: ComboerProps) => {
  const inputRef = useRef<HTMLInputElement>(null!);
  const buttonRef = useRef<HTMLButtonElement>(null!);

  const [query, setQuery] = useState("");
  const resetQuery = () => {
    setQuery("");
    inputRef?.current?.focus();
  };
  const clickButton = (opened: boolean) =>
    !opened && buttonRef.current?.click();

  const filteredOptions =
    query === ""
      ? options
      : options.filter(
          (opt) =>
            fuzzyCompare(query, opt.value) || fuzzyCompare(query, opt.title)
        );

  // style tokens:
  const highlight_bg = bg_color_highlight[color];
  const placeholderTextColor = placeholder_text_color[color];
  const ringColor = ring_color[color];

  const glowColor = glow[color];

  return (
    <Combobox
      disabled={disabled}
      value={selectedOption}
      onChange={onChange}
      by="id"
    >
      {({ open }) => (
        <>
          <div className="relative">
            <Combobox.Input
              ref={inputRef}
              autoComplete="off"
              placeholder={placeholder}
              className={clsx(
                "relative z-50 flex justify-between px-3 h-8 w-full max-w-[62px] min-w-[62px] rounded-md text-base font-mono font-semibold caret-black disabled:cursor-not-allowed",
                `${placeholderTextColor} placeholder:text-base placeholder:lowercase`,
                `${ringColor} ring-inset focus:ring-2 hover:ring-2 appearance-none outline-none`,
                open ? "ring-2 bg-white" : "ring-0 bg-white/0"
                // !open && input_bg
              )}
              displayValue={(dept: ComboOption) => (open ? query : dept.value)}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => clickButton(open)}
              required
            />

            {/* 
                Taking advantage of this button in TWO ways:
                1. as a graphic element to let the user know they must fill in the input field (red dot)
                2. as a way to force headless-ui to open the options menu when the input is clicked (using refs)
            */}
            <Combobox.Button
              className="absolute z-50 flex h-1 w-1 top-[5px] right-[5px] text-red-500 pointer-events-none"
              ref={buttonRef}
              disabled
            >
              {selectedOption.value === "" && (
                <>
                  <span className="absolute rounded-full h-2 w-2 -top-[0.125rem] -left-[0.125rem] animate-ping-slow bg-red-500/75" />
                  <span className="relative rounded-full h-full w-full bg-red-500" />
                </>
              )}
            </Combobox.Button>
          </div>
          <Combobox.Options
            as="div"
            className={clsx(
              "absolute z-40 top-0 left-0 p-2 pr-1 pt-12 bg-white rounded-lg  w-full sm:w-min min-w-[18rem] mb-32",
              "border ring-[3px]zz appearance-none outline-none drop-shadow-md",
              glowColor
            )}
          >
            {/* <Combobox.Button className=" absolute top-0 right-0 flex justify-center items-center p-3 text-rose-500 hover:text-rose-700">
              <IconX />
            </Combobox.Button> */}
            <ul className="flex flex-col gap-[1px] custom-scrollbar-tiny overflow-y-auto overflow-x-hidden max-h-48 pr-3">
              {filteredOptions.length === 0 && (
                <li className="w-full">
                  <button
                    type="button"
                    className="w-full flex justify-center items-center gap-4 px-3 py-2 whitespace-nowrap rounded-md text-rose-700  bg-rose-50 hover:bg-rose-100 font-semibold hover:text-whitezz"
                    onClick={resetQuery}
                  >
                    No results. Click here to reset.
                  </button>
                </li>
              )}
              {filteredOptions.map((option) => (
                <Combobox.Option key={option.id} value={option} as={Fragment}>
                  {({ active, selected }) => (
                    <li
                      className={clsx(
                        "flex gap-4 px-3 py-[0.628rem] rounded-md cursor-pointer whitespace-nowrap",
                        active || selected ? "bg-slate-200" : "bg-transparent"
                      )}
                    >
                      <span className="min-w-[2rem] font-mono font-semibold text-slate-900">
                        {option.label}
                      </span>
                      <span className="flex-1 text-slate-700">
                        {formatTitle(option.title)}
                      </span>
                      {selectedOption.id === option.id && (
                        <IconCheck
                          size={20}
                          stroke={3}
                          className="text-slate-700"
                        />
                      )}
                    </li>
                  )}
                </Combobox.Option>
              ))}
            </ul>
          </Combobox.Options>
        </>
      )}
    </Combobox>
  );
};

function arePropsEqual(
  prev: Readonly<CourseSelectorProps>,
  next: Readonly<CourseSelectorProps>
) {
  if (prev.courseItemAtom.toString() !== next.courseItemAtom.toString())
    return false;
  if (prev.semester !== next.semester) return false;
  if (prev.year !== next.year) return false;
  if (prev.index !== next.index) return false;

  return true;
}
