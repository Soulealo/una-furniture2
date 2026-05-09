import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const styles = await readFile(new URL('../client/styles.css', import.meta.url), 'utf8');
const adminStyles = await readFile(new URL('../client/admin-styles.css', import.meta.url), 'utf8');

test('public product, detail, cart, and checkout images use contain so full product is visible', () => {
    assert.match(styles, /PRODUCT MEDIA FULL IMAGE OVERRIDE/);

    [
        '.product-image img',
        '.product-detail-main-image-wrap img',
        '.page-detail-main-image-wrap img',
        '.cart-item img'
    ].forEach((selector) => {
        assert.match(styles, new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?object-fit:\\s*contain`));
    });
});

test('admin product thumbnails, form previews, and variation previews use contain', () => {
    assert.match(adminStyles, /ADMIN PRODUCT MEDIA FULL IMAGE OVERRIDE/);

    [
        '.product-image-thumb',
        '.image-preview-admin img',
        '.color-variant-preview-admin img',
        '.admin-preview-image img'
    ].forEach((selector) => {
        assert.match(adminStyles, new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?object-fit:\\s*contain`));
    });
});
