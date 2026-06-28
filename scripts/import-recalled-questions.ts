import fs from "fs";
import csv from "csv-parser";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const SUBJECT_ID = "YOUR_SUBJECT_UUID";
const UNIVERSITY_ID = "YOUR_UNIVERSITY_UUID";
const CREATED_BY = "YOUR_ADMIN_USER_UUID";

const rows: any[] = [];

fs.createReadStream("recalled_questions.csv")
  .pipe(csv())
  .on("data", (row) => rows.push(row))
  .on("end", async () => {
    console.log(`Importing ${rows.length} questions...`);

    for (const row of rows) {
      try {
        const { data: question, error } = await supabase
          .from("recalled_questions")
          .insert({
            subject_id: SUBJECT_ID,
            university_id: UNIVERSITY_ID,
            body: row.body,
            year: Number(row.year),
            created_by: CREATED_BY,
          })
          .select()
          .single();

        if (error) {
          console.error(error);
          continue;
        }

        const options = [
          {
            recalled_question_id: question.id,
            label: "A",
            body: row.option_a,
            is_correct: row.answer === "A",
          },
          {
            recalled_question_id: question.id,
            label: "B",
            body: row.option_b,
            is_correct: row.answer === "B",
          },
          {
            recalled_question_id: question.id,
            label: "C",
            body: row.option_c,
            is_correct: row.answer === "C",
          },
          {
            recalled_question_id: question.id,
            label: "D",
            body: row.option_d,
            is_correct: row.answer === "D",
          },
        ];

        const { error: optionError } = await supabase
          .from("recalled_question_options")
          .insert(options);

        if (optionError) {
          console.error(optionError);
        } else {
          console.log(`✓ Imported Question ${row.question_number}`);
        }
      } catch (e) {
        console.error(e);
      }
    }

    console.log("Import complete.");
  });
