<?php
/**
 * Contact and scoping form handler.
 *
 * @project  Jomtien Network — jomtien.net
 * @author   Uvin Vindula (IAMUVIN)
 * @website  https://iamuvin.com
 * @license  MIT — see LICENSE
 *
 * Runs on Hostinger's PHP. Deliberately first-party: the enquiry is delivered
 * to a mailbox on the same host, so there is no third-party processor, no API
 * key to leak, no cross-border transfer question under the PDPA, and no origin
 * to add to the Content-Security-Policy. `form-action 'self'` already allows it.
 *
 * Hostinger caps PHP mail() at 100/day and 10/minute, which is far above what
 * this form will ever produce. Because info@jomtien.net is hosted on the same
 * server, this is local delivery rather than an external relay — the usual
 * mail() deliverability problem does not apply.
 *
 * Works with JavaScript (fetch, JSON reply) and without it (normal POST, HTML
 * reply). Never logs message content.
 */

declare(strict_types=1);

// ── Configuration ───────────────────────────────────────────────────────────
// TO must be a mailbox on this domain. FROM must also be on this domain or the
// message will fail SPF and land in spam — the visitor's address goes in
// Reply-To, never in From.
const MAIL_TO      = 'info@jomtien.net';
const MAIL_FROM    = 'website@jomtien.net';
const SITE_NAME    = 'Jomtien Network';
const RATE_MAX     = 5;      // submissions per window, per address
const RATE_WINDOW  = 3600;   // seconds
const MAX_BODY     = 20000;  // bytes; anything larger is not a real enquiry

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Strips CR/LF so a value can never inject an extra mail header. */
function header_safe(string $v): string
{
    return trim(str_replace(["\r", "\n", "%0a", "%0d"], '', $v));
}

function field(string $key, int $max = 500): string
{
    $raw = $_POST[$key] ?? '';
    if (!is_string($raw)) {
        return '';
    }
    $clean = trim(strip_tags($raw));
    return mb_substr($clean, 0, $max, 'UTF-8');
}

function wants_json(): bool
{
    $accept = $_SERVER['HTTP_ACCEPT'] ?? '';
    $xhr    = $_SERVER['HTTP_X_REQUESTED_WITH'] ?? '';
    return str_contains($accept, 'application/json') || $xhr === 'fetch';
}

/**
 * Per-address rate limit. The key is a salted hash, so the store never holds a
 * readable IP address, and message content never touches it at all.
 */
function rate_limited(): bool
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $key = hash('sha256', $ip . '|' . MAIL_TO);
    $file = sys_get_temp_dir() . '/jn-rate-' . $key;

    $now = time();
    $hits = [];
    if (is_readable($file)) {
        $raw = (string) file_get_contents($file);
        foreach (explode(',', $raw) as $t) {
            $t = (int) $t;
            if ($t > $now - RATE_WINDOW) {
                $hits[] = $t;
            }
        }
    }
    if (count($hits) >= RATE_MAX) {
        return true;
    }
    $hits[] = $now;
    @file_put_contents($file, implode(',', $hits), LOCK_EX);
    return false;
}

/** Ends the request in whichever format the client asked for. */
function finish(bool $ok, string $code, string $message, int $status = 200): never
{
    http_response_code($status);
    if (wants_json()) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => $ok, 'code' => $code, 'message' => $message], JSON_UNESCAPED_UNICODE);
        exit;
    }
    header('Content-Type: text/html; charset=utf-8');
    $safeMsg = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');
    $title   = $ok ? 'Message received' : 'Message not sent';
    echo <<<HTML
    <!doctype html>
    <html lang="en"><head><meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>{$title} — Jomtien Network</title>
    <link rel="stylesheet" href="/dist/styles.css" /></head>
    <body><main class="wrap min-h-screen flex flex-col justify-center py-20">
      <div class="max-w-2xl">
        <p class="u-caps text-coast-lite">{$title}</p>
        <p class="mt-6 text-[length:var(--text-lead)]">{$safeMsg}</p>
        <p class="mt-10"><a href="/en/" class="btn btn-signal">Back to the site</a></p>
      </div>
    </main></body></html>
    HTML;
    exit;
}

// ── Guards ──────────────────────────────────────────────────────────────────

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    finish(false, 'method', 'This address only accepts form submissions.', 405);
}

if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > MAX_BODY) {
    finish(false, 'too_large', 'That message is larger than this form accepts.', 413);
}

// Honeypot. Silently accepted so a bot learns nothing, never delivered.
if (field('website2') !== '') {
    finish(true, 'ok', 'Thank you — your message has been received.');
}

if (rate_limited()) {
    finish(
        false,
        'rate',
        'That is several messages in a short time. Please wait a little, or email ' . MAIL_TO . ' directly.',
        429
    );
}

// ── Validation, mirroring the client rules ──────────────────────────────────

$name    = field('name', 120);
$email   = field('email', 180);
$message = field('message', 4000);

$errors = [];
if ($name === '') {
    $errors[] = 'name';
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'email';
}
if (mb_strlen($message, 'UTF-8') < 20) {
    $errors[] = 'message';
}
if (($_POST['consent'] ?? '') === '') {
    $errors[] = 'consent';
}

if ($errors !== []) {
    finish(false, 'invalid', 'Some details are missing or not valid: ' . implode(', ', $errors) . '.', 422);
}

// ── Compose ─────────────────────────────────────────────────────────────────

$isScope  = ($_POST['form'] ?? '') === 'scope';
$locale   = field('locale', 5) === 'th' ? 'th' : 'en';

$lines = [
    'Name:        ' . $name,
    'Email:       ' . $email,
    'Business:    ' . (field('business', 120) ?: '—'),
    'Phone/LINE:  ' . (field('phone', 60) ?: '—'),
    'Language:    ' . $locale,
];

if ($isScope) {
    $needs = $_POST['needs'] ?? [];
    $needs = is_array($needs) ? array_map(static fn($n) => field_value($n), $needs) : [];
    $lines[] = 'Product:     ' . (field('product', 80) ?: '—');
    $lines[] = 'Today:       ' . (field('existing', 80) ?: '—');
    $lines[] = 'Must do:     ' . ($needs ? implode(', ', $needs) : '—');
    $lines[] = 'Content:     ' . (field('content', 80) ?: '—');
    $lines[] = 'Timing:      ' . (field('timing', 80) ?: '—');
} else {
    $lines[] = 'Project:     ' . (field('projectType', 60) ?: '—');
    $lines[] = 'Current URL: ' . (field('currentUrl', 200) ?: '—');
}

$requestId = bin2hex(random_bytes(6));
$body = implode("\n", $lines)
    . "\n\n--- Message ---\n" . $message
    . "\n\n---\nSent from " . SITE_NAME . " (" . ($isScope ? 'scoping form' : 'enquiry form') . ")"
    . "\nRequest ID: " . $requestId
    . "\nReceived:   " . gmdate('Y-m-d H:i:s') . " UTC";

$subject = header_safe(
    ($isScope ? '[Scope] ' : '[Enquiry] ') . $name . ($isScope ? '' : ' — ' . field('projectType', 60))
);

$headers = [
    'From: ' . SITE_NAME . ' <' . MAIL_FROM . '>',
    'Reply-To: ' . header_safe($email),
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: jomtien.net',
];

$sent = @mail(
    MAIL_TO,
    '=?UTF-8?B?' . base64_encode($subject) . '?=',
    $body,
    implode("\r\n", $headers),
    '-f' . MAIL_FROM
);

// Log the outcome and the request id only. Never the message, never the
// address — the privacy notice says application logs hold no form content.
error_log(sprintf('[jomtien-contact] %s form=%s ok=%s', $requestId, $isScope ? 'scope' : 'enquiry', $sent ? '1' : '0'));

if (!$sent) {
    finish(
        false,
        'provider',
        'The message could not be delivered just now. Please email ' . MAIL_TO
        . ' directly — nothing you typed has been lost, and we will pick it up there.',
        502
    );
}

finish(
    true,
    'ok',
    'Thank you — your message has reached us and a person will reply. Your reference is ' . $requestId . '.'
);

/** Array members arrive raw; give them the same treatment as scalar fields. */
function field_value(mixed $v): string
{
    return is_string($v) ? mb_substr(trim(strip_tags($v)), 0, 80, 'UTF-8') : '';
}
