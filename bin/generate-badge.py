#!/usr/bin/python3
# Script to generate badges from an .svg template.
#
# You can also do this in "desk mode" in regcfp, but sometimes it's easier from
# the commandline.

import pybars

import argparse
import os
import subprocess
import sys
import tempfile


def default_template():
    script_dir = os.path.dirname(os.path.realpath(__file__))
    return os.path.join(script_dir, '..', 'views', 'gnome', 'desk', 'badge_svg.hbs')


def argument_parser():
    parser = argparse.ArgumentParser('regcfp-style badge generation')
    parser.add_argument('NAME', type=str,
                        help='Name of person')
    parser.add_argument('IRCNICK', type=str,
                        help='Chat nickname of person')
    parser.add_argument('--template', '-t', type=str, default=default_template(),
                        help='Path to badge template')
    return parser


def main():
    args = argument_parser().parse_args()

    with open(args.template, 'r') as f:
        badge_template = pybars.Compiler().compile(f.read())

    output_svg = badge_template({
        'names': {'a': {'name': args.NAME}},
        'fields': {'a': {'ircnick': args.IRCNICK}}
    })

    name_escaped = '-'.join(args.NAME.lower().split())
    output_name = 'badge-%s.pdf' % name_escaped

    with tempfile.NamedTemporaryFile('w') as f:
        f.write(output_svg)
        f.flush()
        subprocess.check_call(
            ['inkscape', '--file', f.name, '--export-pdf', output_name, '--without-gui'])

    sys.stdout.write("Generated: %s\n" % output_name)


try:
    main()
except RuntimeError as e:
    sys.stderr.write("%s\n", e)
    sys.exit(1)

