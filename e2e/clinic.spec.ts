import { expect, test, type Page } from '@playwright/test';
import { DateTime } from 'luxon';

const feedbackMessage = `בדיקת דפדפן — הצעה לשיפור ${Date.now()}`;

async function login(page: Page, role: 'patient' | 'doctor' | 'admin') {
  await page.goto('/login');
  await page.getByLabel('סוג משתמש').click();
  await page
    .getByRole('option', {
      name: { patient: 'מטופל', doctor: 'רופא', admin: 'מנהל מרפאה' }[role],
      exact: true,
    })
    .click();
  await page.getByLabel('כתובת אימייל').fill(`${role}@medtime.local`);
  await page.getByLabel('סיסמה').fill('MedTime2026!');
  await page.getByRole('button', { name: 'כניסה למערכת', exact: true }).click();
}

test('registration, booking, live availability, cancellation and feedback', async ({
  page,
  browser,
}) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/register');
  await page.getByLabel('שם מלא').fill('מטופל בדיקת דפדפן');
  await page.getByLabel('כתובת אימייל').fill(`browser-${Date.now()}@medtime.local`);
  await page.getByLabel('מספר טלפון').fill('0501234567');
  await page.getByLabel('סיסמה').fill('BrowserTest2026!');
  await page.getByRole('button', { name: 'יצירת חשבון', exact: true }).click();
  await expect(page).toHaveURL(/my-appointments/);
  await page.getByRole('link', { name: 'קביעת תור חדש' }).click();
  await page.getByRole('button', { name: 'לזמינות ולקביעת תור' }).first().click();
  let date = DateTime.now().setZone('Asia/Jerusalem').plus({ days: 1 });
  while (date.weekday === 5 || date.weekday === 6) date = date.plus({ days: 1 });
  await page.getByLabel('תאריך התור').fill(date.toISODate()!);
  const dialog = page.getByRole('dialog');
  const firstSlot = dialog.getByRole('button', { name: /^\d{2}:\d{2}$/ }).first();
  await expect(firstSlot).toBeVisible();
  const slotTime = (await firstSlot.textContent())!;

  const observerContext = await browser.newContext();
  const observer = await observerContext.newPage();
  await observer.goto('http://localhost:5173');
  await observer.getByRole('button', { name: 'לזמינות ולקביעת תור' }).first().click();
  await observer.getByLabel('תאריך התור').fill(date.toISODate()!);
  await expect(
    observer.getByRole('dialog').getByRole('button', { name: slotTime, exact: true }),
  ).toBeVisible();
  await firstSlot.click();
  await dialog.getByRole('button', { name: 'אישור קביעת תור' }).click();
  await expect(dialog.getByText('התור נקבע בהצלחה')).toBeVisible();
  await expect(
    observer.getByRole('dialog').getByRole('button', { name: slotTime, exact: true }),
  ).toHaveCount(0);
  await dialog.getByRole('button', { name: 'סגירה' }).click();
  await page.getByRole('link', { name: 'התורים שלי', exact: true }).click();
  await expect(page.getByRole('button', { name: 'ביטול תור', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'ביטול תור', exact: true }).click();
  await page.getByRole('button', { name: 'כן, לבטל תור' }).click();
  await expect(page.getByText('אין תורים קרובים ביומן')).toBeVisible();
  await expect(
    observer.getByRole('dialog').getByRole('button', { name: slotTime, exact: true }),
  ).toBeVisible();
  await observerContext.close();
  await page.getByRole('button', { name: 'הצעות ומשוב', exact: true }).click();
  await page.getByLabel('תוכן הפנייה').fill(feedbackMessage);
  await page.getByRole('button', { name: 'שליחת משוב' }).click();
  await expect(page.getByText('תודה! המשוב נשלח לצוות המרפאה.')).toBeVisible();
  await page.getByRole('button', { name: 'סגירה', exact: true }).click();
  await page.screenshot({ path: 'test-results/patient-desktop.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('doctor role opens daily and weekly calendar', async ({ page }) => {
  await login(page, 'doctor');
  await expect(page).toHaveURL(/schedule/);
  await expect(page.getByRole('heading', { name: 'היומן הרפואי שלי' })).toBeVisible();
  await page.getByRole('button', { name: 'שבועי', exact: true }).click();
  await expect(page.getByRole('button', { name: 'שבועי', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.goto('/admin');
  await expect(page).toHaveURL(/schedule/);
});

test('admin sees users, doctors, schedule configuration and received feedback', async ({
  page,
}) => {
  await login(page, 'admin');
  await expect(page).toHaveURL(/admin/);
  const adminFeedback = `בדיקת קבלת משוב מנהל ${Date.now()}`;
  const submitted = await page.request.post('/api/feedback', {
    data: { category: 'suggestion', message: adminFeedback },
  });
  expect(submitted.status()).toBe(201);
  await page.getByRole('tab', { name: 'הצעות ומשוב', exact: true }).click();
  await expect(page.getByText(adminFeedback)).toBeVisible();
  await page.getByRole('tab', { name: 'משתמשים', exact: true }).click();
  await page.getByLabel('חיפוש משתמשים').fill('patient@medtime.local');
  await expect(page.getByText('patient@medtime.local', { exact: false })).toBeVisible();
  await page.getByRole('tab', { name: 'רופאים ושעות קבלה', exact: true }).click();
  await page.getByRole('button', { name: 'עריכת שעות ופרטים' }).first().click();
  await expect(page.getByLabel('משך תור בדקות')).toHaveValue('20');
  await expect(page.getByRole('heading', { name: 'שעות קבלה שבועיות' })).toBeVisible();
  await page.getByRole('button', { name: 'ביטול', exact: true }).click();
  await page.screenshot({ path: 'test-results/admin-desktop.png', fullPage: true });
});

test('public mobile page fits viewport and protects private routes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'הצוות הרפואי שלנו' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/home-mobile.png', fullPage: true });
  await page.goto('/my-appointments');
  await expect(page).toHaveURL(/login/);
});

test('authenticated dashboards fit a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const role of ['patient', 'doctor', 'admin'] as const) {
    const response = await page.request.post('/api/auth/login', {
      data: { email: `${role}@medtime.local`, password: 'MedTime2026!', role },
    });
    expect(response.status()).toBe(200);
    await page.goto({ patient: '/my-appointments', doctor: '/schedule', admin: '/admin' }[role]);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({ path: `test-results/${role}-mobile.png`, fullPage: true });
    expect((await page.request.post('/api/auth/logout')).status()).toBe(200);
  }
});
