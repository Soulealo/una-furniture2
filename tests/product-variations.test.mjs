import assert from 'node:assert/strict';
import test from 'node:test';
import { __test__ } from '../worker/index.js';

test('productVariations are normalized with legacy color aliases for compatibility', () => {
    const product = __test__.cleanProductInput({
        name: 'Preview Sofa',
        price: 1200000,
        category: 'Furniture',
        images: ['images/preview-sofa.jpg'],
        productVariations: [
            {
                name: 'Two seat',
                value: '2-seat',
                image: 'images/preview-sofa-2-seat.jpg',
                price: 1200000,
                salePrice: 1100000,
                stock: 3,
                sku: 'SOFA-2-SEAT'
            }
        ]
    });

    assert.equal(product.productVariations.length, 1);
    assert.equal(product.productVariations[0].name, 'Two seat');
    assert.equal(product.productVariations[0].value, '2-seat');
    assert.equal(product.colorVariants[0].colorValue, '2-seat');
    assert.equal(__test__.validateProduct(product, true), '');
});

test('variation validation rejects invalid images and sale prices above variant price', () => {
    const product = __test__.cleanProductInput({
        name: 'Unsafe Sofa',
        price: 1200000,
        category: 'Furniture',
        images: ['images/unsafe-sofa.jpg'],
        productVariations: [
            {
                name: 'Large',
                value: 'large',
                image: 'javascript:alert(1)',
                price: 1200000,
                salePrice: 1300000
            }
        ]
    });

    assert.equal(
        __test__.validateProduct(product, true),
        'Every product variation image must be a valid URL or supported image path.'
    );

    product.productVariations[0].image = 'images/unsafe-sofa-large.jpg';
    product.colorVariants[0].image = 'images/unsafe-sofa-large.jpg';

    assert.equal(
        __test__.validateProduct(product, true),
        'Variation sale price cannot be greater than variation price.'
    );
});
