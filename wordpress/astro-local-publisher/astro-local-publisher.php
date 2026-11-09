<?php
/**
 * Plugin Name: Astro Local Publisher
 * Description: Signals the local Astro publisher when published content, Divi templates or menus change. Does not expose a public endpoint or store credentials.
 * Version: 1.0.0
 */
if (!defined('ABSPATH')) { exit; }
function oderinde_astro_signal_change() {
    // Outside the public web root; the local Node watcher reads only this timestamp.
    $marker = dirname(rtrim(ABSPATH, '/\\')) . '/.astro-publish-request';
    file_put_contents($marker, gmdate('c') . ' ' . wp_generate_uuid4(), LOCK_EX);
}
add_action('save_post', function ($post_id, $post) {
    if (wp_is_post_revision($post_id) || wp_is_post_autosave($post_id)) { return; }
    if ($post->post_status === 'publish' || in_array($post->post_type, array('et_pb_layout', 'et_theme_builder', 'et_template', 'et_header_layout', 'et_body_layout', 'et_footer_layout', 'wp_template', 'wp_template_part'), true)) {
        oderinde_astro_signal_change();
    }
}, 20, 2);
add_action('deleted_post', 'oderinde_astro_signal_change');
add_action('wp_update_nav_menu', 'oderinde_astro_signal_change');
add_action('updated_option', function ($option) {
    if (in_array($option, array('blogname', 'blogdescription', 'show_on_front', 'page_on_front', 'permalink_structure', 'et_theme_builder_templates', 'et_divi'), true)) {
        oderinde_astro_signal_change();
    }
});
