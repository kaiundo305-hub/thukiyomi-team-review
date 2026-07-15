var SPREADSHEET_ID = "1RZ37qorvc8nvBaQhqbMvbt4nqdGC_fHGRggeXibMTow";
var SECRET_KEY = "tsukiyomi-2026-key";

function doPost(e) {
  try {
    var sheet = prepareSheet_();
    var payload = parsePayload_(e);
    var incomingSecret = (payload && payload.secretKey) || (e && e.parameter && e.parameter.secretKey) || "";

    if (!incomingSecret || incomingSecret !== SECRET_KEY) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, message: "unauthorized" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    appendPayload_(sheet, payload);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, message: String(error) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    // 日記データ取得エンドポイント（復元用）
    if (e && e.parameter && (e.parameter.pid || e.parameter.email)) {
      var incomingSecret = e.parameter.secretKey || '';
      if (!incomingSecret || incomingSecret !== SECRET_KEY) {
        var errJson = JSON.stringify({ ok: false, message: 'unauthorized' });
        if (e.parameter.callback) {
          return ContentService
            .createTextOutput(e.parameter.callback + '(' + errJson + ')')
            .setMimeType(ContentService.MimeType.JAVASCRIPT);
        }
        return ContentService
          .createTextOutput(errJson)
          .setMimeType(ContentService.MimeType.JSON);
      }
      var lookupType = e.parameter.email ? 'email' : 'pid';
      var lookupValue = e.parameter.email || e.parameter.pid;
      var diaryResult = getDiaryData_(lookupValue, lookupType);
      if (e.parameter.callback) {
        var bodyText = diaryResult.getContent();
        return ContentService
          .createTextOutput(e.parameter.callback + '(' + bodyText + ')')
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
      return diaryResult;
    }

    var sheet = prepareSheet_();

    if (e && e.parameter && e.parameter.data) {
      var payload = JSON.parse(e.parameter.data || "{}");
      var incomingSecret = (payload && payload.secretKey) || (e.parameter.secretKey || "");

      if (!incomingSecret || incomingSecret !== SECRET_KEY) {
        return ContentService
          .createTextOutput("NG: unauthorized / received=" + incomingSecret + " / expected=" + SECRET_KEY)
          .setMimeType(ContentService.MimeType.TEXT);
      }

      appendPayload_(sheet, payload);

      return ContentService
        .createTextOutput("OK: GETデータをrecordsに追加しました。")
        .setMimeType(ContentService.MimeType.TEXT);
    }

    if (e && e.parameter && e.parameter.test === "1") {
      sheet.appendRow([
        new Date().toISOString(),
        toJst_(new Date()),
        "do_get_test",
        "browser_url_test",
        "",
        "接続テスト",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        JSON.stringify({ message: "doGet test ok" })
      ]);
    }

    return ContentService
      .createTextOutput("OK: 月読み日記 records に接続できています。test=1 を付けた場合はテスト行を追加しました。")
      .setMimeType(ContentService.MimeType.TEXT);
  } catch (error) {
    return ContentService
      .createTextOutput("NG: " + String(error))
      .setMimeType(ContentService.MimeType.TEXT);
  }
}

function parsePayload_(e) {
  if (e && e.parameter && e.parameter.data) {
    return JSON.parse(e.parameter.data || "{}");
  }
  if (e && e.postData && e.postData.contents) {
    return JSON.parse(e.postData.contents || "{}");
  }
  return {};
}

function prepareSheet_() {
  var headers = [
    "savedAt",
    "savedAtJst",
    "recordType",
    "page",
    "participantId",
    "name",
    "email",
    "birth",
    "zodiac",
    "shuku",
    "concern",
    "q",
    "q2",
    "payload_json"
  ];
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName("records") || ss.insertSheet("records");
  ensureHeaders_(sheet, headers);
  return sheet;
}

function normalizePage_(page) {
  return String(page || "").trim().replace("_sync.html", ".html");
}

function appendPayload_(sheet, payload) {
  var profile = payload.profile || {};
  var participantId = profile.participantId || "";
  var page = normalizePage_(payload.page || "");

  var newRow = [
    payload.savedAt || "",
    payload.savedAtJst || toJst_(new Date()),
    payload.recordType || "",
    page,
    participantId,
    profile.name || "",
    profile.email || "",
    profile.birth || "",
    profile.zodiac || "",
    profile.shuku || "",
    profile.concern || "",
    profile.q || "",
    profile.q2 || "",
    JSON.stringify(payload.payload || {})
  ];

  // participantId がある場合は同一人物・同一ページの行を上書き
  if (participantId) {
    var lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      var pidCol = 5;  // E列（1始まり）
      var pageCol = 4; // D列（1始まり）
      var pidValues = sheet.getRange(2, pidCol, lastRow - 1, 1).getValues();
      var pageValues = sheet.getRange(2, pageCol, lastRow - 1, 1).getValues();
      for (var i = 0; i < pidValues.length; i++) {
        var existingPid = String(pidValues[i][0]).trim();
        var existingPage = normalizePage_(pageValues[i][0]);
        if (existingPid === participantId && existingPage === page) {
          sheet.getRange(i + 2, 1, 1, newRow.length).setValues([newRow]);
          return;
        }
      }
    }
  }

  sheet.appendRow(newRow);
}

function ensureHeaders_(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    return;
  }

  var current = sheet
    .getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length))
    .getValues()[0];

  var changed = false;

  for (var i = 0; i < headers.length; i++) {
    if (current[i] !== headers[i]) {
      current[i] = headers[i];
      changed = true;
    }
  }

  if (changed) {
    sheet
      .getRange(1, 1, 1, headers.length)
      .setValues([current.slice(0, headers.length)]);
  }
}

function toJst_(date) {
  return Utilities.formatDate(date, "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss");
}

// ===== 日記データ取得（クライアントの復元用） =====
function getDiaryData_(identifier, lookupType) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('records');
  if (!sheet || sheet.getLastRow() < 2) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, days: {} }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var NUM_COLS = 14;
  var lastRow = sheet.getLastRow();
  var data = sheet.getRange(2, 1, lastRow - 1, NUM_COLS).getValues();
  var PID_COL = 4;
  var EMAIL_COL = 6;
  var PAGE_COL = 3;
  var PAYLOAD_COL = 13;
  var lookupCol = (lookupType === 'email') ? EMAIL_COL : PID_COL;

  var days = {};
  var daySavedAt = {};

  for (var i = 0; i < data.length; i++) {
    var rowVal = String(data[i][lookupCol]).trim().toLowerCase();
    if (rowVal !== identifier.toLowerCase()) continue;

    var page = normalizePage_(String(data[i][PAGE_COL]));
    var dayMatch = page.match(/challenge_day(\d+)/);
    if (!dayMatch) continue;

    var dayNum = dayMatch[1];
    var savedAt = String(data[i][0]);

    try {
      var payload = JSON.parse(String(data[i][PAYLOAD_COL]) || '{}');
      var fields = payload.fields || {};

      // ① 新形式：autoBackupが送った構造化日記データ
      var diaryJsonStr = fields['7日間日記専用記録'];
      if (diaryJsonStr) {
        try {
          var diary = JSON.parse(diaryJsonStr);
          if (diary && diary.lines) {
            var hasContent = (diary.lines || []).some(function(l) {
              return (l.text || '').trim().length > 0;
            });
            if (hasContent && (!days[dayNum] || savedAt > (daySavedAt[dayNum] || ''))) {
              days[dayNum] = diary;
              daySavedAt[dayNum] = savedAt;
              continue;
            }
          }
        } catch(e2) {}
      }

      // ② 旧形式：フィールドのテキストを行として使う（構造化データがない場合のみ）
      if (!days[dayNum] || savedAt > (daySavedAt[dayNum] || '')) {
        var lines = [];
        var SKIP_KEYS = ['attachedFiles', 'actionText', 'source'];
        Object.keys(fields).forEach(function(key) {
          if (SKIP_KEYS.indexOf(key) !== -1) return;
          var val = String(fields[key] || '').trim();
          if (val && val.length > 1) {
            lines.push({ number: String(lines.length + 1), text: val, placeholder: key });
          }
        });
        if (lines.length > 0) {
          days[dayNum] = { day: dayNum, lines: lines };
          daySavedAt[dayNum] = savedAt;
        }
      }
    } catch(err) {}
  }

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, days: days }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== 重複行クリーンアップ（手動実行用） =====
function removeDuplicates() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName("records");
  if (!sheet) {
    Logger.log("ERROR: recordsシートが見つかりません");
    return;
  }

  var lastRow = sheet.getLastRow();
  Logger.log("総行数（ヘッダー含む）: " + lastRow);
  if (lastRow < 3) {
    Logger.log("データ行なし");
    return;
  }

  var NUM_COLS = 14;
  var data = sheet.getRange(2, 1, lastRow - 1, NUM_COLS).getValues();
  var PID_COL = 4;  // 0始まり → E列 = participantId
  var PAGE_COL = 3; // 0始まり → D列 = page

  var seen = {};
  var deleteRows = [];

  for (var i = 0; i < data.length; i++) {
    var pid = String(data[i][PID_COL]).trim();
    var page = normalizePage_(data[i][PAGE_COL]);
    if (!pid) continue;
    var key = pid + "|" + page;
    if (seen[key] !== undefined) {
      deleteRows.push(seen[key] + 2); // 古い行を削除対象に
      seen[key] = i;
    } else {
      seen[key] = i;
    }
  }

  Logger.log("削除対象行（スプレッドシート行番号）: " + JSON.stringify(deleteRows));

  deleteRows.sort(function(a, b) { return b - a; });
  deleteRows.forEach(function(rowNum) { sheet.deleteRow(rowNum); });

  Logger.log("完了。削除した行数: " + deleteRows.length + "行");
}
